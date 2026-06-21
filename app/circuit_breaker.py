import time

failure_count = 0
failure_threshold = 3

state = "CLOSED"

opened_at = None
recovery_timeout = 30


def can_execute():
    global state, opened_at

    if state == "CLOSED":
        return True

    if state == "OPEN":

        if time.time() - opened_at > recovery_timeout:
            state = "HALF_OPEN"
            return True

        return False

    return True


def record_success():
    global failure_count, state

    failure_count = 0
    state = "CLOSED"


def record_failure():
    global failure_count, state, opened_at

    failure_count += 1

    print(f"Failures: {failure_count}")

    if failure_count >= failure_threshold:

        state = "OPEN"
        opened_at = time.time()

        print("CIRCUIT OPENED")