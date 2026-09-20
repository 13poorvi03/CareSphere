from pydantic import BaseModel, Field
from typing import List, Optional

class FamilyMemberProfile(BaseModel):
    patient_id: str
    family_id: str
    name: str
    relationship: str  # Self, Father, Mother, Spouse, Child
    age: int
    gender: str
    blood_group: str
    critical_alerts_count: int = 0
    active_meds_count: int = 0
    is_primary_account: bool = False

class FamilyProfilesResponse(BaseModel):
    family_id: str
    primary_patient_id: str
    members: List[FamilyMemberProfile]

