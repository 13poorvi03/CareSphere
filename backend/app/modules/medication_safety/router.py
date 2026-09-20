from fastapi import APIRouter, Depends
from typing import List
from app.modules.medication_safety.schemas import (
    MedicineItem, DuplicateMedicineAlert, DrugInteractionAlert,
    MedicationSafetyAuditRequest, MedicationSafetyReport
)
from app.modules.medication_safety.service import MedicationSafetyService
from app.core.security import get_current_user

router = APIRouter(prefix="/safety", tags=["3. Medication Safety Engine"])

@router.post("/audit", response_model=MedicationSafetyReport)
async def audit_patient_medications(
    payload: MedicationSafetyAuditRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Comprehensive medication safety audit:
    - Resolves brands to generic active salts.
    - Flags duplicate brands (e.g. Crocin + Dolo 650) to prevent toxic double-dosing.
    - Evaluates drug-drug interactions with OpenSearch / clinical pharmacology index.
    - Returns Explainable AI cards (Why, Concern, Action).
    """
    return MedicationSafetyService.audit_medications(payload)

@router.post("/check-duplicates", response_model=List[DuplicateMedicineAlert])
async def check_duplicates(
    medicines: List[MedicineItem],
    current_user: dict = Depends(get_current_user)
):
    """
    Directly checks a list of medicines for duplicate active ingredients across different brands.
    """
    return MedicationSafetyService.check_duplicate_medicines(medicines)

@router.post("/check-interactions", response_model=List[DrugInteractionAlert])
async def check_interactions(
    medicines: List[MedicineItem],
    current_user: dict = Depends(get_current_user)
):
    """
    Directly evaluates pairwise drug-drug interactions.
    """
    return MedicationSafetyService.check_drug_interactions(medicines)

