from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.modules.health_timeline.schemas import TimelineEvent, HealthTimelineResponse, TimelineEventCreate
from app.modules.health_timeline.service import HealthTimelineService
from app.core.security import get_current_user

router = APIRouter(prefix="/timeline", tags=["4. Health Timeline"])

@router.get("/{patient_id}", response_model=HealthTimelineResponse)
async def get_health_timeline(
    patient_id: str,
    event_type: Optional[str] = Query(None, description="Optional filter: SYMPTOM_ASSESSMENT, PRESCRIPTION_ADDED, MEDICATION_SAFETY_ALERT, CLINICAL_CONSULT, LAB_REPORT"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generates a unified chronological health timeline for the specified patient,
    aggregating symptoms, prescriptions, alerts, consults, and vitals.
    """
    return HealthTimelineService.get_patient_timeline(patient_id, event_type)

@router.post("/events", response_model=TimelineEvent)
async def create_timeline_event(
    payload: TimelineEventCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Logs a new custom health event to the patient's DynamoDB timeline.
    """
    return HealthTimelineService.record_event(payload)

