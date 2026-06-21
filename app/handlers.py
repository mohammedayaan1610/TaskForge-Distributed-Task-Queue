def send_email(payload):
    print(f"Sending email: {payload}")
    return f"Email sent: {payload}"


def generate_report(payload):
    print(f"Generating report: {payload}")
    return f"Report generated: {payload}"


def resize_image(payload):
    print(f"Resizing image: {payload}")
    return f"Image resized: {payload}"


TASK_HANDLERS = {
    "email": send_email,
    "report": generate_report,
    "image": resize_image
}