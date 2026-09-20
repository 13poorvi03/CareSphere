from pydantic import BaseModel, Field
from typing import Optional, List

class MedicalSimplifierRequest(BaseModel):
    medical_text: str = Field(
        ...,
        example="Patient exhibits acute pharyngitis and mild hypertension. Prescribed Amoxicillin-clavulanate 625mg b.i.d. and Telmisartan 40mg q.d."
    )
    target_language: str = Field(
        "hindi",
        example="hindi, telugu, tamil, bengali, marathi, english"
    )

class MedicalSimplifierResponse(BaseModel):
    original_text: str
    target_language: str
    plain_english_explanation: str
    regional_language_translation: str
    key_takeaways: List[str]
    critical_warnings: List[str]

