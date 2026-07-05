[READMEds.md](https://github.com/user-attachments/files/29671223/READMEds.md)
# TaskForge

A distributed background job processing system built with FastAPI, Redis, PostgreSQL, and React. TaskForge handles asynchronous task execution with priority scheduling, fault-tolerant retries, and a real-time monitoring dashboard.

---

## Overview

TaskForge is a production-inspired task queue built from first principles. It covers the full lifecycle of a background job — from API submission to worker execution, retry handling, failure isolation, and observability — without relying on managed queue services like Celery or BullMQ.

**Core capabilities**

- Priority-based task scheduling via Redis Sorted Sets
- Concurrent worker pool with configurable parallelism
- Exponential backoff retry engine with configurable max attempts
- Dead Letter Queue (DLQ) for isolating and replaying failed tasks
- Worker heartbeat monitoring and circuit breaker pattern
- Async audio conversion pipeline using FFmpeg
- Real-time monitoring dashboard built in React
- Full task persistence in PostgreSQL with WAL-backed crash recovery
- Dockerized for single-command local deployment

---

## Architecture

```
Producers (REST API / Scheduler / Events)
         │
         ▼
   ┌─────────────┐
   │  FastAPI    │  validates, scores, stores task
   └──────┬──────┘
          │ pushes to
          ▼
   ┌─────────────┐
   │   Redis     │  Sorted Set — priority queue
   └──────┬──────┘
          │ polls
          ▼
   ┌─────────────────────────────────┐
   │  Worker Pool                    │
   │  execute → ack → persist result │
   │  fail → retry engine → DLQ      │
   └──────────────┬──────────────────┘
                  │
          ┌───────┴────────┐
          │                │
   ┌──────▼──────┐  ┌──────▼──────┐
   │ PostgreSQL  │  │     DLQ     │
   │ task store  │  │ (Redis key) │
   └──────┬──────┘  └─────────────┘
          │
          ▼
   ┌─────────────┐
   │  Dashboard  │  React + polling
   └─────────────┘
```

**Task lifecycle**

1. Client submits a task via `POST /tasks`
2. FastAPI validates the payload and writes it to PostgreSQL
3. A priority score is computed (`scoring.py`) and the task is pushed to Redis Sorted Set
4. A worker polls Redis, pops the highest-priority task, and executes the registered handler
5. On success — result is written to PostgreSQL, task marked `COMPLETED`
6. On failure — retry engine applies exponential backoff; after max attempts the task moves to DLQ
7. Dashboard reads queue stats and task state in real time

---

## Tech stack

| Layer | Technology |
|---|---|
| API | FastAPI, SQLAlchemy |
| Queue | Redis Sorted Set |
| Storage | PostgreSQL |
| Workers | Python multiprocessing |
| Media | FFmpeg |
| Frontend | React, TypeScript, Vite |
| Infra | Docker, Docker Compose |

---

## Getting started

**Prerequisites:** Docker and Docker Compose installed.

```bash
# Clone the repository
git clone https://github.com/mohammedayaan1610/TaskForge-Distributed-Task-Queue.git
cd TaskForge-Distributed-Task-Queue

# Start all services
docker compose up --build
```

The API will be available at `http://localhost:8000` and the dashboard at `http://localhost:5173`.

**Running services individually**

```bash
# Backend
uvicorn app.main:app --reload

# Worker
python worker.py

# Frontend
cd frontend && npm install && npm run dev
```

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/tasks` | Submit a new task |
| `GET` | `/tasks` | List all tasks and their status |
| `GET` | `/queue-status` | Current queue depth and worker stats |
| `POST` | `/dlq/replay/{task_id}` | Requeue a failed task from the DLQ |

---

## Audio conversion pipeline

TaskForge ships with an asynchronous audio conversion handler as a reference implementation of a long-running task.

Supported formats: MP3, WAV, FLAC, AAC, OGG, M4A

How it works:

1. File is uploaded and stored in a temporary location
2. A conversion task is enqueued with source format, target format, and file path
3. A worker picks it up and runs FFmpeg
4. The converted file is made available for download
5. Temporary uploads are cleaned up automatically after processing

---

## Project structure

```
TaskForge/
├── app/
│   ├── main.py          # FastAPI app and route definitions
│   ├── models.py        # SQLAlchemy models
│   ├── database.py      # DB session and connection setup
│   ├── redis_client.py  # Redis connection and queue operations
│   ├── scoring.py       # Priority score calculation
│   └── handlers.py      # Task handler registry
├── worker.py            # Worker process — polls Redis, runs handlers
├── frontend/            # React dashboard
├── docker-compose.yml
├── Dockerfile
└── Dockerfile.worker
```

---

## Reliability design

**Retry engine** — failed tasks are re-enqueued with exponential backoff (1s → 2s → 4s → ...). Attempt count is tracked in PostgreSQL. Once max attempts are exceeded, the task is moved to the DLQ rather than silently dropped.

**Dead Letter Queue** — failed tasks land in a dedicated DLQ Redis key. The `/dlq/replay/{task_id}` endpoint allows manual or automated requeue after investigation.

**Worker heartbeat** — each worker emits a heartbeat on a fixed interval. The dashboard surfaces stale workers so unhealthy processes are visible immediately.

**Circuit breaker** — repeated failures from the same handler trip a circuit breaker, halting execution of that task type until the circuit resets. This prevents a broken handler from exhausting the worker pool.

**PostgreSQL persistence** — task state is written to PostgreSQL at every lifecycle transition. Workers are stateless; a crashed worker leaves no orphaned tasks.

---

## Roadmap

- Horizontal worker scaling with configurable concurrency per node
- WebSocket-based live dashboard updates (replace polling)
- Prometheus metrics endpoint + Grafana dashboard
- JWT-based authentication for the API
- Kubernetes deployment manifests
- Video conversion support
- Email notification hooks on task completion or failure

---

## Author

Mohammed Ayaan KO
GitHub: [mohammedayaan1610](https://github.com/mohammedayaan1610)

---

## License

MIT License. See `LICENSE` for details.
