from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AlertItem(BaseModel):
    id: str
    patient_id: str
    alert_type: str  # MISSED_FOLLOWUP, RED_FLAG, MEDICINE_REMINDER, SAFETY_WARNING
    title: str
    message: str
    severity: str  # CRITICAL, HIGH, MODERATE, INFO
    due_date_or_time: Optional[str] = None
    action_required: str
    status: str = "PENDING"  # PENDING, TAKEN, SNOOZED, RESOLVED
    created_at: str

class MedicineReminderAction(BaseModel):
    alert_id: str
    action: str = Field(..., example="TAKEN or SNOOZE")
    snooze_minutes: Optional[int] = 30

class AlertsSummaryResponse(BaseModel):
    patient_id: str
    total_active_alerts: int
    missed_followups_count: int
    red_flags_count: int
    medicine_reminders_count: int
    alerts: List[AlertItem]

