from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict, Any
from datetime import datetime, timezone

from app.database.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.container import Container, ContainerStatus
from app.models.loadtest import LoadTest
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

class DashboardMetrics(BaseModel):
    total_containers: int
    running_containers: int
    stopped_containers: int
    recent_load_tests: List[Dict[str, Any]]
    system_status: str

@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get real metrics for the student dashboard."""
    try:
        # Container counts
        containers = db.query(Container).filter(Container.user_id == current_user.id).all()
        total_containers = len(containers)
        running_containers = sum(1 for c in containers if c.status == ContainerStatus.running)
        stopped_containers = sum(1 for c in containers if c.status == ContainerStatus.stopped)

        # Recent load tests
        recent_tests = (
            db.query(LoadTest)
            .filter(LoadTest.user_id == current_user.id)
            .order_by(desc(LoadTest.created_at))
            .limit(5)
            .all()
        )

        tests_data = []
        for test in recent_tests:
            tests_data.append({
                "id": test.id,
                "status": test.status,
                "created_at": test.created_at.isoformat(),
                "requests": test.total_requests,
                "avg_response_time": test.avg_response_time_ms
            })

        return DashboardMetrics(
            total_containers=total_containers,
            running_containers=running_containers,
            stopped_containers=stopped_containers,
            recent_load_tests=tests_data,
            system_status="healthy"
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error fetching dashboard metrics: {e}")
        return DashboardMetrics(
            total_containers=0,
            running_containers=0,
            stopped_containers=0,
            recent_load_tests=[],
            system_status="error"
        )
