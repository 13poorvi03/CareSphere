from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TimelineEventCreate(BaseModel):
    patient_id: str = Field(..., example="P-101")
    event_type: str = Field(..., example="SYMPTOM_ASSESSMENT, PRESCRIPTION_ADDED, MEDICATION_SAFETY_ALERT, CLINICAL_CONSULT, LAB_REPORT")
    title: str = Field(..., example="High Fever & Headache Reported")
    description: str = Field(..., example="Patient logged temperature 102F. Advised triage: Moderate Risk.")
    severity: Optional[str] = Field("NORMAL", example="NORMAL, MODERATE, HIGH, CRITICAL")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)

class TimelineEvent(BaseModel):
    id: str
    patient_id: str
    event_type: str
    timestamp: str
    title: str
    description: str
    severity: str
    details: Dict[str, Any] = Field(default_factory=dict)

class HealthTimelineResponse(BaseModel):
    patient_id: str
    total_events: int
    events: List[TimelineEvent]

