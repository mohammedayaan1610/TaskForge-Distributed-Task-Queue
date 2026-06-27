from app.redis_client import r
from app.database import SessionLocal
from app.models import Task
from app.handlers import TASK_HANDLERS
import app.handlers
from datetime import datetime, UTC
import time
import random
import os
import traceback
from pathlib import Path
from app.scoring import calculate_score
from app.circuit_breaker import can_execute, record_success, record_failure

MAX_RETRIES = 5

print("="*80)
print("Worker PID:", os.getpid())
print("Worker file:", __file__)
print("Handlers file:", app.handlers.__file__)
print("Registered handlers:", list(TASK_HANDLERS.keys()))
print("TASK_HANDLERS id:", id(TASK_HANDLERS))
print("="*80)
print("Worker started...")

while True:
    r.set(
    "worker_heartbeat",
    datetime.now().isoformat()
)

    task_data = r.zpopmax("task_queue")

    if not task_data:
        time.sleep(1)
        continue

    task_id = task_data[0][0]

    if isinstance(task_id, bytes):
        task_id = task_id.decode()
    print(f"Found task: {task_id}")

    db = SessionLocal()
    task = None

    try:

        task = db.query(Task).filter(Task.id == task_id).first()

        if not task:
            print("Task not found in DB")
            continue

        if task.status == "COMPLETED":
            print(f"[{task.id}] Task is already COMPLETED. Skipping duplicate queue entry.")
            continue

        db_status_before = task.status
        pop_time = datetime.now(UTC).isoformat()
        
        uploads_dir = Path("uploads")
        _, ext = os.path.splitext(task.original_filename) if task.original_filename else ("", "")
        input_filename = f"{task.id}{ext}"
        input_path = uploads_dir / input_filename
        
        converted_dir = Path("converted")
        output_path = converted_dir / f"{task.id}.{task.target_format}" if task.target_format else None

        print("\n" + "="*25)
        print("Task ID:", task.id)
        print("Task Type:", task.task_type)
        print("Original filename:", task.original_filename)
        print("Target format:", task.target_format)
        print("Redis queue pop time:", pop_time)
        print("Upload file exists?:", input_path.exists())
        print("Upload file path:", input_path)
        print("Output file path:", output_path)
        print("Output exists?:", output_path.exists() if output_path else False)
        print("Worker PID:", os.getpid())
        print("Database status BEFORE processing:", db_status_before)
        print("Retry count:", task.retry_count)
        print("="*25)

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
        print("DB commit: Marked as PROCESSING")

        print(f"Processing task: {task.task_type}")

        handler = TASK_HANDLERS.get(task.task_type)

        if not handler:
            print(f"Handler for {task.task_type} not found. Attempting hot-reload of handlers...")
            import importlib
            import app.handlers
            importlib.reload(app.handlers)
            
            # Update the local reference to the reloaded dictionary
            handler = app.handlers.TASK_HANDLERS.get(task.task_type)

        print("-" * 40)
        print("Task ID:", task.id)
        print("Task Type:", task.task_type)
        print("Handler found?", handler is not None)
        print("TASK_HANDLERS keys:", list(app.handlers.TASK_HANDLERS.keys()))
        print("-" * 40)

        if handler:

            result = handler(task)

            record_success()

            task.result = result
            task.status = "COMPLETED"
            task.completed_at = datetime.now(UTC)

        else:

            task.status = "FAILED"
            task.result = "Handler not found"
            task.error_message = f"No handler found for {task.task_type}"
            task.completed_at = datetime.now(UTC)

            r.lpush(
                "dead_letter_queue",
                task.id
            )

        task.updated_at = datetime.now(UTC)

        db.commit()
        print("DB commit: Marked as", task.status)
        
        print("Database status AFTER processing:", task.status)

        print(f"Completed processing for task: {task_id}")

    except Exception as e:

        full_traceback = traceback.format_exc()
        print(f"ERROR: {e}\n{full_traceback}")

        if task and task.status != "COMPLETED":

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
                print("DB commit: Marked as PENDING for retry")

                score = calculate_score(task)

                r.zadd(
                    "task_queue",
                    {task.id: score}
                )
                print("Redis push: Added to task_queue for retry")

            else:
                
                record_failure()

                r.lpush("dead_letter_queue", task.id)
                print("Redis push: Added to dead_letter_queue")
                
                task.result = "Max retries exceeded"
                task.error_message = full_traceback
                task.status = "FAILED"
                task.completed_at = datetime.now(UTC)
                task.updated_at = datetime.now(UTC)

                db.commit()
                print("DB commit: Marked as FAILED permanently")

                print("Task permanently failed")

    finally:

        db.close()
