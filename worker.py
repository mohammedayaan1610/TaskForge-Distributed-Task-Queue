from app.redis_client import r
from app.database import SessionLocal
from app.models import Task
from app.handlers import TASK_HANDLERS
from datetime import datetime, UTC
import time

print("Worker started...")

while True:

    task_id = (
        r.rpop("high_priority_queue")
        or r.rpop("medium_priority_queue")
        or r.rpop("low_priority_queue")
    )

    if not task_id:
        time.sleep(1)
        continue

    print(f"Found task: {task_id}")

    db = SessionLocal()

    try:
        task = db.query(Task).filter(Task.id == task_id).first()

        if not task:
            print("Task not found in DB")
            db.close()
            continue

        task.status = "PROCESSING"
        task.updated_at = datetime.now(UTC)
        db.commit()

        print(f"Processing task: {task.task_type}")

        handler = TASK_HANDLERS.get(task.task_type)

        if handler:

            result = handler(task.payload)

            task.result = result
            task.status = "COMPLETED"

        else:

            task.status = "FAILED"
            task.result = f"No handler found for {task.task_type}"

        task.updated_at = datetime.now(UTC)

        db.commit()

        print(f"Completed task: {task_id}")

    except Exception as e:

        print("ERROR:", e)

        if task:
            task.status = "FAILED"
            task.result = str(e)
            db.commit()

    finally:
        db.close()