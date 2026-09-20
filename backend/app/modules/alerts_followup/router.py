from fastapi import APIRouter, Depends
from app.modules.alerts_followup.schemas import (
    AlertsSummaryResponse, MedicineReminderAction
)
from app.modules.alerts_followup.service import AlertsFollowupService
from app.core.security import get_current_user

router = APIRouter(prefix="/alerts", tags=["6. Alerts + Follow-up Engine"])

@router.get("/{patient_id}", response_model=AlertsSummaryResponse)
async def get_patient_alerts(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves active alerts including missed doctor follow-ups,
    urgent-care red flags, and smart medication reminders.
    """
    return AlertsFollowupService.get_patient_alerts(patient_id)

@router.post("/reminder-action")
async def update_reminder(
    payload: MedicineReminderAction,
    current_user: dict = Depends(get_current_user)
):
    """
    Allows patient to mark a medication reminder as TAKEN or SNOOZED,
    logging adherence into EventBridge.
    """
    return AlertsFollowupService.update_reminder_status(payload)

