<div align="center">
  <h1>🚀 IntelliScaleSim</h1>
  <p><strong>Intelligent Scaling Simulator & Cloud Orchestration Platform</strong></p>
  <p><em>A high-fidelity platform designed for education, research, and infrastructure optimization. Deploy applications, simulate heavy traffic loads, and analyze real-time container autoscaling behaviors with integrated billing telemetry.</em></p>
</div>

---

## 📖 About The Project

**IntelliScaleSim** bridges the gap between theoretical cloud concepts and practical container orchestration. Built as a comprehensive orchestration engine, it allows users to spawn Docker containers on the fly, define custom autoscaling policies (e.g., *“Scale up when CPU > 75%”*), fire load tests at those containers, and watch the system intelligently manage the instances—all while tracking theoretical cloud costs in real-time.

Whether you are a student learning cloud architecture, a researcher studying scaling algorithms, or a developer benchmarking application performance, IntelliScaleSim provides a complete, isolated "Cloud Lab" right on your hardware.

---

## ✨ Core Modules & Features

### 1. 🐳 Dynamic Container Orchestration
- **Live Deployment**: Deploy web apps, APIs, or custom Docker images directly from the dashboard.
- **Resource Management**: Assign hard limits to CPU and Memory allocation for each container deployment.
- **Direct Docker Daemon Binding**: The FastAPI backend communicates directly with the host's Docker socket via `docker.from_env()`, allowing true native container management.

### 2. ⚡ Intelligent Auto-Scaling Engine
- **Custom Policies**: Create declarative rules based on CPU or Memory utilization (e.g., target 60% CPU).
- **Automated Lifecycle**: The background orchestrator evaluates container health every few seconds. When thresholds are breached, it automatically spins up replica containers or tears them down to save resources.
- **Scale-to-Zero Support**: Policies can be configured to aggressively scale down unused resources.

### 3. 📈 Load Testing Studio
- **Concurrent Traffic Simulation**: Unleash high-concurrency HTTP requests against your deployed containers to trigger auto-scaling rules.
- **Real-Time Visualization**: Watch live, interactive AreaCharts map out Request Latency, Success Rates, and RPS (Requests Per Second) as the load increases.

### 4. 🎯 Scenario-Based Billing Simulator
- **Cloud Provider Costing**: Predict what your infrastructure would cost on AWS, GCP, or Azure.
- **Auto-Fill Telemetry**: Click on any actively running container to instantly import its current CPU core count and Memory footprint into the pricing simulator to see exact monthly run-rates.

### 5. 📊 Real-Time Telemetry (Prometheus & Grafana)
- Integrated natively with the **Prometheus** time-series database and **Grafana** visualization suites.
- Container network bytes, disk I/O, and compute utilization are scraped in real-time for deeper analytical insights.

---

## 🛠️ Architecture & Tech Stack

IntelliScaleSim utilizes a modern, decoupled Client-Server architecture.

*   **Frontend**: Built with **React** (TypeScript) and **Vite** for lightning-fast HMR. The UI is styled with **TailwindCSS**, employing a premium "Glassmorphism" design system, micro-animations, and **Recharts** for data visualization.
*   **Backend**: Powered by **FastAPI** (Python) for asynchronous, high-throughput API design. It uses **Pydantic** for rigid schema validation and interacts with the host os via the official Docker Python SDK.
*   **Database**: **PostgreSQL** handles persistent state for user accounts, deployment configurations, scaling policies, and billing histories via **SQLAlchemy** ORM.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Python 3.9+
- Node.js (v18+) & `npm`
- **Docker Desktop** (Must be running for the engine to connect)
- PostgreSQL installed locally (or running via a Docker container on port `5432`)

### 1. Backend Setup
The backend requires access to a PostgreSQL instance and the Docker engine.
```bash
cd backend
python -m venv .venv

# Activate Virtual Environment (Windows)
.\.venv\Scripts\activate
# (Unix/macOS)
source .venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Specify your database connection string
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/intelliscalesim"

# Start the Server
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to see the glassmorphic dashboard!

### 3. Monitoring Stack
Launch the integrated monitoring tools required for advanced telemetry:
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```
- **Grafana**: `http://localhost:3500` (Default login: `admin` / `admin`)
- **Prometheus**: `http://localhost:9090`

---

## 🔐 Quick Access (Demo Data)
If you seeded your database with the default initialization scripts, you can log in immediately using:
- **Email**: `demo@test.com`
- **Password**: `Password123!`

---

## 📁 System Blueprint

| Directory | Purpose |
|---|---|
| `/backend` | Core orchestration logic, FastAPI server, Database models, Background Autoscaler. |
| `/frontend` | React/Vite dashboard, State management, Recharts integration. |
| `/examples` | Pre-built test applications (`nginx`, `flask`, `node`) for deploying scenarios. |
| `/grafana` | Pre-configured dashboard JSON models and Prometheus provisioning. |
| `/scripts` | OS-level setup scripts for database bootstrapping. |

---

<br>
<div align="center">
  <i>Developed to bring the power of cloud scalability to local development environments.</i>
</div>
