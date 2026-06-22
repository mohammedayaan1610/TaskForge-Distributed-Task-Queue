
email_attempts = 0

def send_email(payload):# TESTING RETRY ENGINESO GOES FAIL FAIL SUCESSS
    global email_attempts

    email_attempts += 1

    if email_attempts < 3:
        raise Exception("Temporary outage")

    return f"Email sent: {payload}"
    # print(f"Sending email: {payload}")
    # return f"Email sent: {payload}"

def generate_report(payload):# THIS FOR CIRCUIT BREAKER - FAIL,FAIL,FAIL...
     raise Exception("Report Service Down")
    #print(f"Generating report: {payload}")
    #return f"Report generated: {payload}"


def resize_image(payload):
    print(f"Resizing image: {payload}")
    return f"Image resized: {payload}"


TASK_HANDLERS = {
    "email": send_email,
    "report": generate_report,
    "image": resize_image
}