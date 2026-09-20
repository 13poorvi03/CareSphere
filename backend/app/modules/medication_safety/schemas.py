from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class MedicineItem(BaseModel):
    brand_name: str = Field(..., example="Dolo 650")
    generic_name: Optional[str] = Field(None, example="Paracetamol")
    strength: Optional[str] = Field(None, example="650mg")
    source: Optional[str] = Field("current_rx", example="current_rx or past_active")

class DuplicateMedicineAlert(BaseModel):
    active_salt: str
    conflicting_brands: List[str]
    total_calculated_dose_mg: Optional[float] = None
    safe_daily_limit_mg: float = 4000
    is_overdose_risk: bool = True
    severity: str = "CRITICAL"
    why: str
    concern: str
    action: str

class DrugInteractionAlert(BaseModel):
    drug_a: str
    drug_b: str
    severity: str  # CRITICAL, MAJOR, MODERATE
    why: str
    concern: str
    action: str

class MedicationSafetyAuditRequest(BaseModel):
    patient_id: str = Field("P-101", example="P-101")
    medicines: List[MedicineItem]

class MedicationSafetyReport(BaseModel):
    patient_id: str
    is_safe: bool
    total_medicines_checked: int
    critical_alerts_count: int
    major_alerts_count: int
    duplicate_alerts: List[DuplicateMedicineAlert]
    interaction_alerts: List[DrugInteractionAlert]
    overall_recommendation: str

