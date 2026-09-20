from pydantic import BaseModel, Field
from typing import List, Optional


class HealthChatRequest(BaseModel):
    patient_id: str = Field(..., example="P-101")
    message: str = Field(..., min_length=1, max_length=2000)
    conversation: List[dict] = Field(default_factory=list)


class HealthChatResponse(BaseModel):
    reply: str
    disclaimer: str
    suggested_prompts: List[str] = Field(default_factory=list)
