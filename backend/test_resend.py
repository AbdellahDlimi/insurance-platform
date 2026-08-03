import os
import resend
from dotenv import load_dotenv

load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")

try:
    response = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": "test@trustpool.io",
        "subject": "Test Email",
        "html": "<p>Test</p>"
    })
    print("Success:", response)
except Exception as e:
    print("Error:", e)
