from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Dict, Any, Optional
from app.modules.prescription_intelligence.schemas import (
    PrescriptionUploadResponse, CleanMedicationSchedule
)
from app.modules.prescription_intelligence.service import PrescriptionIntelligenceService
from app.core.security import get_current_user

router = APIRouter(prefix="/prescriptions", tags=["2. Prescription Intelligence & Vault"])

@router.post("/upload", response_model=PrescriptionUploadResponse)
async def upload_prescription(
    file: UploadFile = File(...),
    patient_id: str = Form("P-101"),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts PDF or Image of a prescription.
    Uploads to AWS S3, triggers Bedrock OCR extraction, parses dosage/frequency/duration,
    and returns a clean medication schedule.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty prescription file uploaded")
    
    return PrescriptionIntelligenceService.process_prescription(
        patient_id=patient_id,
        file_bytes=contents,
        filename=file.filename or "prescription.jpg",
        content_type=file.content_type or "image/jpeg"
    )

@router.get("/vault/{patient_id}", response_model=List[Dict[str, Any]])
async def get_prescription_vault(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Digital Prescription Vault: Retrieves all past prescriptions, original files in S3,
    and extracted medication schedules.
    """
    return PrescriptionIntelligenceService.list_prescriptions(patient_id)

