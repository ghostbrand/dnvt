from pydantic import BaseModel


class SMSRequest(BaseModel):
    phone_number: str
    message: str
