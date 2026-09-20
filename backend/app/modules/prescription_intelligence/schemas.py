from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ExtractedMedicine(BaseModel):
    brand_name: str
    generic_name: str
    strength: str
    dosage_form: str  # Tablet, Capsule, Syrup, Inhaler, Injection
    frequency: str  # e.g., "1-0-1", "Once daily", "TID"
    timing: str  # "After food", "Before food", "Bedtime"
    duration_days: int
    instructions: Optional[str] = None
    morning: int = 0
    afternoon: int = 0
    evening: int = 0
    night: int = 0

class MedicationScheduleSlot(BaseModel):
    time_slot: str  # Morning (8:00 AM), Afternoon (1:00 PM), Evening (6:00 PM), Night (10:00 PM)
    medicines: List[Dict[str, Any]]

class CleanMedicationSchedule(BaseModel):
    patient_id: str
    prescription_id: str
    date_prescribed: str
    doctor_name: Optional[str] = "Dr. Anita Patel, MD"
    clinic_or_hospital: Optional[str] = "Apollo Multi-Specialty Clinic"
    total_medications: int
    schedule_slots: List[MedicationScheduleSlot]
    special_precautions: List[str] = Field(default_factory=list)

class PrescriptionUploadResponse(BaseModel):
    prescription_id: str
    patient_id: str
    file_name: str
    file_url: str
    upload_timestamp: str
    extracted_medicines: List[ExtractedMedicine]
    clean_schedule: CleanMedicationSchedule
    raw_ocr_text: Optional[str] = None

