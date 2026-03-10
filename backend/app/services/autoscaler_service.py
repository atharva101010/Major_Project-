import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.scaling_policy import ScalingPolicy, ScalingEvent
from app.models.container import Container
from app.services.docker_service import DockerService

logger = logging.getLogger(__name__)


class AutoScalerService:
    """
    Core auto-scaling service
    Evaluates policies and makes scaling decisions
    """
    
    def __init__(self, db: Session, docker_service: DockerService):
        self.db = db
        self.docker_service = docker_service
    
    def get_current_replica_count(self, container_id: int) -> int:
        """Get current number of replicas for a container"""
        # Count running containers with this container as parent, plus the parent itself
        replicas = self.db.query(Container).filter(
            Container.parent_id == container_id,
            Container.status == 'running'
        ).count()
        
        # Include the parent container itself
        parent = self.db.query(Container).filter(Container.id == container_id).first()
        if parent and parent.status == 'running':
            replicas += 1
            
        return replicas
    
    async def get_container_metrics(self, container_id: int) -> Optional[dict]:
        """Get current CPU and memory metrics for a container"""
        try:
            import random
            
            container = self.db.query(Container).filter(Container.id == container_id).first()
            if not container:
                return None
            
            # For simulated containers, generate random realistic metrics
            # In production, this would query real Docker stats
            # For real Docker containers
            if container.container_id:
                try:
                    stats = await self.docker_service.get_container_stats_async(container.container_id)
                    # Convert stats to the format expected by autoscaler
                    # Docker stats returns memory_usage_mb, we need memory_percent
                    mem_limit = container.memory_limit or 512
                    mem_percent = (stats.get('memory_usage_mb', 0) / mem_limit) * 100
                    
                    return {
                        'cpu_percent': stats.get('cpu_percent', 0),
                        'memory_percent': mem_percent
                    }
                except Exception as stats_err:
                    logger.warning(f"Failed to get real stats for container {container_id}: {stats_err}")
                    return None
            
            # Simulated container - generate fake metrics for testing
            # Vary metrics to trigger auto-scaling
            base_cpu = random.uniform(3, 15)  # Will occasionally go above 10%
            base_memory = random.uniform(10, 30)  # Will occasionally go above 20%
            
            return {
                'cpu_percent': round(base_cpu, 2),
                'memory_percent': round(base_memory, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting metrics for container {container_id}: {e}")
            return None
    
    def should_scale_up(self, policy: ScalingPolicy, metrics: dict, current_replicas: int) -> tuple[bool, str]:
        """Determine if should scale up"""
        if not policy.enabled:
            return False, "policy_disabled"
        
        if current_replicas >= policy.max_replicas:
            return False, "max_replicas_reached"
        
        # Check cooldown period
        if policy.last_scaled_at:
            time_since_scale = (datetime.now(timezone.utc) - policy.last_scaled_at).total_seconds()
            if time_since_scale < policy.cooldown_period:
                return False, "cooldown_active"
        
        # Check CPU threshold
        cpu_val = metrics.get('cpu_percent', 0)
        if cpu_val >= policy.scale_up_cpu_threshold:
            return True, "cpu"
        
        # Check memory threshold
        mem_val = metrics.get('memory_percent', 0)
        if mem_val >= policy.scale_up_memory_threshold:
            return True, "memory"
        
        return False, "thresholds_not_met"
    
    def should_scale_down(self, policy: ScalingPolicy, metrics: dict, current_replicas: int) -> tuple[bool, str]:
        """Determine if should scale down"""
        if not policy.enabled:
            return False, "policy_disabled"
        
        if current_replicas <= policy.min_replicas:
            return False, "min_replicas_reached"
        
        # Check cooldown period
        if policy.last_scaled_at:
            time_since_scale = (datetime.now(timezone.utc) - policy.last_scaled_at).total_seconds()
            if time_since_scale < policy.cooldown_period:
                return False, "cooldown_active"
        
        # Check both CPU and memory are below thresholds
        cpu_val = metrics.get('cpu_percent', 0)
        mem_val = metrics.get('memory_percent', 0)
        if (cpu_val < policy.scale_down_cpu_threshold and 
            mem_val < policy.scale_down_memory_threshold):
            return True, "both_low"
        
        return False, "thresholds_not_met"
    
    def scale_up(self, policy: ScalingPolicy, trigger_metric: str, metric_value: float) -> bool:
        """Scale up by creating a new replica"""
        try:
            current_replicas = self.get_current_replica_count(policy.container_id)
            
            # Get parent container
            parent = self.db.query(Container).filter(Container.id == policy.container_id).first()
            if not parent:
                logger.error(f"Parent container {policy.container_id} not found")
                return False
            
            # Create new replica container record
            replica_name = f"intelliscale-{parent.id}-{parent.name}-replica-{current_replicas}"
            
            # Run actual Docker container
            # We use a simple port offset, in a real system we'd use find_available_port
            external_port = parent.port + current_replicas
            
            logger.info(f"Scaling up: Running Docker container {replica_name} on port {external_port}")
            
            try:
                # We need to detect internal port. For simplicity in this fix, we assume it's the same as parent's mapped internal port
                # In current implementation, we move that logic to docker_service or similar
                # For now, we'll try to find what the parent is mapped to
                docker_container_id = self.docker_service.run_container(
                    image=parent.image,
                    name=replica_name,
                    port=external_port,
                    internal_port=parent.port, # This is a guess, but often students map 5000:5000
                    cpu_limit=parent.cpu_limit or "0.5",
                    mem_limit=parent.memory_limit or "512m"
                )
            except Exception as docker_err:
                logger.error(f"Docker scale up failed: {docker_err}")
                return False

            new_replica = Container(
                name=f"{parent.name}-replica-{current_replicas}",
                image=parent.image,
                port=external_port,
                container_id=docker_container_id,
                status='running',
                user_id=parent.user_id,
                parent_id=parent.id,
                started_at=datetime.now(timezone.utc)
            )
            
            self.db.add(new_replica)
            
            # Log scaling event
            event = ScalingEvent(
                policy_id=policy.id,
                container_id=policy.container_id,
                action='scale_up',
                trigger_metric=trigger_metric,
                metric_value=metric_value,
                replica_count_before=current_replicas,
                replica_count_after=current_replicas + 1
            )
            self.db.add(event)
            
            # Update policy
            policy.last_scaled_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            logger.info(f"Successfully scaled up container {policy.container_id}: {current_replicas} → {current_replicas + 1}")
            return True
            
        except Exception as e:
            logger.error(f"Error scaling up: {e}")
            self.db.rollback()
            return False
    
    def scale_down(self, policy: ScalingPolicy, trigger_metric: str, metric_value: float) -> bool:
        """Scale down by removing a replica"""
        try:
            current_replicas = self.get_current_replica_count(policy.container_id)
            
            # Find newest replica to remove
            replica = self.db.query(Container).filter(
                Container.parent_id == policy.container_id,
                Container.status == 'running'
            ).order_by(Container.created_at.desc()).first()
            
            if not replica:
                logger.warning(f"No replicas found to scale down for container {policy.container_id}")
                return False
            
            # Stop and remove replica
            if replica.container_id:
                try:
                    logger.info(f"Scaling down: Stopping and removing Docker container {replica.container_id[:12]}")
                    self.docker_service.stop_container(replica.container_id)
                    self.docker_service.remove_container(replica.container_id)
                except Exception as docker_err:
                    logger.warning(f"Failed to remove Docker container during scale down: {docker_err}")
            
            replica.status = 'stopped'
            replica.stopped_at = datetime.now(timezone.utc)
            
            # Log scaling event
            event = ScalingEvent(
                policy_id=policy.id,
                container_id=policy.container_id,
                action='scale_down',
                trigger_metric=trigger_metric,
                metric_value=metric_value,
                replica_count_before=current_replicas,
                replica_count_after=current_replicas - 1
            )
            self.db.add(event)
            
            # Update policy
            policy.last_scaled_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            logger.info(f"Scaled down container {policy.container_id}: {current_replicas} → {current_replicas - 1}")
            return True
            
        except Exception as e:
            logger.error(f"Error scaling down: {e}")
            self.db.rollback()
            return False
    
    async def evaluate_policy(self, policy: ScalingPolicy) -> None:
        """Evaluate a single policy and take action if needed"""
        try:
            # Get current metrics
            metrics = await self.get_container_metrics(policy.container_id)
            if not metrics:
                logger.debug(f"No metrics available for container {policy.container_id}")
                return
            
            cpu_val = metrics.get('cpu_percent', 0)
            mem_val = metrics.get('memory_percent', 0)
            logger.info(f"📊 Policy {policy.id} Evaluation: Container {policy.container_id} | CPU: {cpu_val}% (Target: {policy.scale_up_cpu_threshold}%) | Mem: {mem_val}%")
            
            current_replicas = self.get_current_replica_count(policy.container_id)
            
            # Check if should scale up
            should_scale_up, reason = self.should_scale_up(policy, metrics, current_replicas)
            if should_scale_up:
                metric_key = f"{reason}_percent"
                logger.info(f"Scaling up container {policy.container_id} due to {reason}: {metrics[metric_key]}%")
                self.scale_up(policy, reason, metrics[metric_key])
                return
            
            # Check if should scale down
            should_scale_down, reason = self.should_scale_down(policy, metrics, current_replicas)
            if should_scale_down:
                logger.info(f"Scaling down container {policy.container_id} due to low resource usage")
                self.scale_down(policy, "both_low", min(metrics['cpu_percent'], metrics['memory_percent']))
                return
            
            logger.debug(f"No scaling action needed for container {policy.container_id}")
            
        except Exception as e:
            logger.error(f"Error evaluating policy {policy.id}: {e}")
    
    async def evaluate_all_policies(self) -> None:
        """Evaluate all enabled policies"""
        try:
            policies = self.db.query(ScalingPolicy).filter(ScalingPolicy.enabled == True).all()
            logger.info(f"Evaluating {len(policies)} active scaling policies")
            
            for policy in policies:
                await self.evaluate_policy(policy)
                
        except Exception as e:
            logger.error(f"Error in evaluate_all_policies: {e}")


# Global instance (will be initialized in main.py)
autoscaler_service: Optional[AutoScalerService] = None
