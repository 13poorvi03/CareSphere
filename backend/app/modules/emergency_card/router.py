from fastapi import APIRouter, Depends, Request
from app.modules.emergency_card.schemas import EmergencyCardData
from app.modules.emergency_card.service import EmergencyCardService
from app.core.security import get_current_user

router = APIRouter(prefix="/emergency", tags=["5. Emergency Health Card & QR"])

@router.get("/card/{patient_id}", response_model=EmergencyCardData)
async def get_emergency_card(
    patient_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Generates minimal emergency info (blood group, allergies, current meds, ICE contact)
    and returns a scannable high-resolution QR code.
    """
    base_url = str(request.base_url).rstrip("/")
    return EmergencyCardService.get_emergency_card(patient_id, host_url=base_url)

@router.get("/public/{patient_id}", response_model=EmergencyCardData)
async def get_public_emergency_view(
    patient_id: str,
    request: Request
):
    """
    Public Emergency Landing Endpoint (Unauthenticated / First Responder mode).
    Permitted under Cedar policy rule 1 for instant access during trauma or rescue.
    """
    base_url = str(request.base_url).rstrip("/")
    return EmergencyCardService.get_emergency_card(patient_id, host_url=base_url)

