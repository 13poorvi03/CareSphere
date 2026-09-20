from pydantic import BaseModel, Field
from typing import List, Optional

class EmergencyContact(BaseModel):
    name: str = Field(..., example="Pooja Sharma")
    relationship: str = Field(..., example="Spouse")
    phone: str = Field(..., example="+91-98765-43210")
    alternate_phone: Optional[str] = None

class EmergencyCardData(BaseModel):
    patient_id: str
    full_name: str
    date_of_birth: str
    age: int
    gender: str
    blood_group: str
    organ_donor: bool = True
    chronic_conditions: List[str]
    critical_allergies: List[str]
    current_active_medications: List[str]
    emergency_contacts: List[EmergencyContact]
    special_medical_instructions: Optional[str] = None
    qr_code_url: Optional[str] = None
    public_emergency_url: Optional[str] = None
    last_updated: str

