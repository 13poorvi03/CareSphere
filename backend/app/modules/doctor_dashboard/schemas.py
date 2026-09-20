from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class DoctorClinicalSummary(BaseModel):
    doctor_id: str
    doctor_name: str
    patient_id: str
    patient_name: str
    age: int
    gender: str
    blood_group: str
    chief_complaint: str
    triage_level: str  # EMERGENCY, HIGH_RISK, MODERATE_RISK, LOW_RISK
    current_active_medications: List[Dict[str, Any]]
    detected_safety_issues: List[Dict[str, Any]]
    recent_symptoms_timeline: List[Dict[str, Any]]
    clinical_recommendations: List[str]
    last_consultation_date: str

