from fastapi import APIRouter, Depends
from app.modules.localization.schemas import MedicalSimplifierRequest, MedicalSimplifierResponse
from app.modules.localization.service import MedicalSimplifierService
from app.core.security import get_current_user

router = APIRouter(prefix="/translate", tags=["Medical Language Simplifier & Regional Translation"])

@router.post("/simplify", response_model=MedicalSimplifierResponse)
async def simplify_medical_text(
    payload: MedicalSimplifierRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Amazon Bedrock Medical Simplifier:
    Translates complex clinical notes, prescriptions, and lab abbreviations
    into empathetic, easy-to-understand plain language in Hindi, Telugu, Tamil, Bengali, or Marathi.
    """
    return MedicalSimplifierService.simplify_and_translate(payload)

