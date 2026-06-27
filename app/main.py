from fastapi import FastAPI, Depends, File, UploadFile, Form
from fastapi.responses import FileResponse
import os
import shutil
from sqlalchemy.orm import Session
import uuid
from app.redis_client import r
from app.database import engine, get_db
from app.models import Task
from app.schemas import TaskCreate
from app.scoring import calculate_score
from datetime import datetime, UTC
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Task.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Distributed Task Queue Running"}

@app.post("/tasks")
def create_task(
    file: UploadFile = File(...),
    target_format: str = Form(...),
    priority: int = Form(5),
    deadline_hours: int = Form(24),
    db: Session = Depends(get_db)
):

    os.makedirs("uploads", exist_ok=True)
    
    task_id = str(uuid.uuid4())
    _, ext = os.path.splitext(file.filename)
    filename = f"{task_id}{ext}"
    file_path = os.path.join("uploads", filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    new_task = Task(
        id=task_id,
        task_type="audio_convert",
        payload="",
        priority=priority,
        deadline_hours=deadline_hours,
        status="PENDING",
        original_filename=file.filename,
        target_format=target_format
    )

    db.add(new_task)
    db.commit()
    score = calculate_score(new_task)


    r.zadd(
        "task_queue",
        {task_id: score}
    )
    return {
    "task_id": task_id,
    "status": "PENDING"
    }
@app.get("/tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db)):

    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        return {"error": "Task not found"}

    return {
    "id": task.id,
    "task_type": task.task_type,
    "priority": task.priority,
    "status": task.status,
    "result": task.result,
    "created_at": task.created_at,
    "updated_at": task.updated_at,
    "original_filename": task.original_filename,
    "output_filename": task.output_filename,
    "target_format": task.target_format,
    "error_message": task.error_message,
    "output_size_bytes": task.output_size_bytes,
    "conversion_duration": task.conversion_duration,
    "completed_at": task.completed_at
}

@app.get("/download/{task_id}")
def download_converted_file(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.status != "COMPLETED" or not task.output_path:
        return {"error": "File not found or task not completed"}
    
    if not os.path.exists(task.output_path):
        return {"error": "File missing on server"}
        
    return FileResponse(
        path=task.output_path, 
        filename=task.output_filename, 
        media_type="application/octet-stream"
    )
  
@app.get("/queue-status")
def queue_status(db: Session = Depends(get_db)):

    pending = (
        db.query(Task)
        .filter(Task.status == "PENDING")
        .count()
    )

    processing = (
        db.query(Task)
        .filter(Task.status == "PROCESSING")
        .count()
    )

    completed = (
        db.query(Task)
        .filter(Task.status == "COMPLETED")
        .count()
    )

    failed = (
        db.query(Task)
        .filter(Task.status == "FAILED")
        .count()
    )

    return {
        "redis_queue_size": r.zcard("task_queue"),
        "dead_letter_queue": r.llen("dead_letter_queue"),
        "pending_tasks": pending,
        "processing_tasks": processing,
        "completed_tasks": completed,
        "failed_tasks": failed
    }
    
@app.post("/dlq/replay/{task_id}")
def replay_task(task_id: str, db: Session = Depends(get_db)):

    task = db.query(Task).filter(
        Task.id == task_id
    ).first()

    if not task:
        return {"error": "Task not found"}

    if task.status != "FAILED":
        return {"error": f"Cannot replay task with status {task.status}"}

    task.retry_count = 0
    task.status = "PENDING"
    score = calculate_score(task)

    r.zadd(
        "task_queue",
        {task.id: score}
    )
    
    r.lrem("dead_letter_queue", 0, task.id)

    db.commit()

    return {
        "message": "Task replayed",
        "task_id": task.id
    }
@app.get("/worker-health")
def worker_health():

    heartbeat = r.get("worker_heartbeat")

    if not heartbeat:
        return {"status": "OFFLINE"}

    heartbeat = datetime.fromisoformat(heartbeat)

    diff = (
        datetime.now() - heartbeat
    ).total_seconds()

    if diff < 30:
        return {"status": "HEALTHY"}

    return {"status": "OFFLINE"}