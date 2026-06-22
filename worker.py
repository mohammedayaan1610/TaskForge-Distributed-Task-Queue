from app.redis_client import r
from app.database import SessionLocal
from app.models import Task
from app.handlers import TASK_HANDLERS
from datetime import datetime, UTC
import time
import random

from app.circuit_breaker import can_execute, record_success, record_failure

MAX_RETRIES = 5

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
    task = None

    try:

        task = db.query(Task).filter(Task.id == task_id).first()

        if not task:
            print("Task not found in DB")
            continue

        if not can_execute():
    
    
            r.lpush("dead_letter_queue", task.id)

            task.status = "FAILED"
            task.result = "Circuit breaker open"
            task.updated_at = datetime.now(UTC)

            db.commit()

            print("CIRCUIT OPEN - TASK MOVED TO DLQ")

            continue

        task.status = "PROCESSING"
        task.updated_at = datetime.now(UTC)

        db.commit()

        print(f"Processing task: {task.task_type}")

        handler = TASK_HANDLERS.get(task.task_type)

        if handler:

            result = handler(task.payload)

            record_success()

            task.result = result
            task.status = "COMPLETED"

        else:

            task.status = "FAILED"
            task.result = f"No handler found for {task.task_type}"

            r.lpush(
                "dead_letter_queue",
                task.id
            )

        task.updated_at = datetime.now(UTC)

        db.commit()

        print(f"Completed task: {task_id}")

    except Exception as e:

        
        print(f"ERROR: {e}")

        if task:

            task.retry_count += 1

            if task.retry_count < MAX_RETRIES:

                wait_time = (2**task.retry_count) + random.uniform(0, 1)

                print(
                    f"Retry {task.retry_count}/{MAX_RETRIES} "
                    f"in {wait_time:.2f} seconds"
                )

                time.sleep(wait_time)

                task.status = "PENDING"
                task.updated_at = datetime.now(UTC)

                db.commit()

                if task.priority >= 8:

                    r.lpush("high_priority_queue", task.id)

                elif task.priority >= 4:

                    r.lpush("medium_priority_queue", task.id)

                else:

                    r.lpush("low_priority_queue", task.id)

            else:
                
                record_failure()

                r.lpush("dead_letter_queue", task.id)
                
                task.result = f"Max retries exceeded: {str(e)}"
                task.status = "FAILED"
                task.updated_at = datetime.now(UTC)

                db.commit()

                print("Task permanently failed")

    finally:

        db.close()
