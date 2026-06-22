from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
import uuid
from app.redis_client import r
from app.database import engine, get_db
from app.models import Task
from app.schemas import TaskCreate

app = FastAPI()

Task.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Distributed Task Queue Running"}

@app.post("/tasks")
def create_task(task: TaskCreate, db: Session = Depends(get_db)):

    task_id = str(uuid.uuid4())

    new_task = Task(
        id=task_id,
        task_type=task.task_type,
        payload=task.payload,
        priority=task.priority,
        status="PENDING"
    )

    db.add(new_task)
    db.commit()
    if task.priority >= 8:
        r.lpush("high_priority_queue", task_id)

    elif task.priority >= 4:
        r.lpush("medium_priority_queue", task_id)

    else:
        r.lpush("low_priority_queue", task_id)

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
    "updated_at": task.updated_at
}
  
@app.get("/queue-status")
def queue_status():

    return {
        "high_priority_queue": r.llen("high_priority_queue"),
        "medium_priority_queue": r.llen("medium_priority_queue"),
        "low_priority_queue": r.llen("low_priority_queue"),
        "dead_letter_queue": r.llen("dead_letter_queue")
    }    