from app.redis_client import r
from app.database import SessionLocal
from app.models import Task
from datetime import datetime, UTC
import time

while True:
    task_id = r.rpop("task_queue")

    if task_id:

        db = SessionLocal()

        try:
            task = db.query(Task).filter(Task.id == task_id).first()

            if task:

                task.status = "PROCESSING"
                task.updated_at = datetime.now(UTC)
                db.commit()

                print(f"Processing task: {task_id}")

                time.sleep(5)

                task.status = "COMPLETED"
                task.result = f"{task.task_type} processed successfully"
                task.updated_at = datetime.now(UTC)
                db.commit()

                print(f"Completed task: {task_id}")

        except Exception as e:

            if task:
                task.status = "FAILED"
                task.result = str(e)
                task.updated_at = datetime.now(UTC)
                db.commit()

            print(f"Task Failed: {e}")

        finally:
            db.close()