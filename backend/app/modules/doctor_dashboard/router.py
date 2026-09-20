from fastapi import APIRouter, Depends
from app.modules.doctor_dashboard.schemas import DoctorClinicalSummary
from app.modules.doctor_dashboard.service import DoctorDashboardService
from app.core.security import get_current_user, authorize_cedar

router = APIRouter(prefix="/doctor", tags=["Doctor Dashboard View"])

@router.get("/summary/{patient_id}", response_model=DoctorClinicalSummary)
async def get_doctor_patient_summary(
    patient_id: str,
    current_user: dict = Depends(authorize_cedar("viewDoctorDashboard"))
):
    """
    Physician Dashboard Endpoint:
    Provides holistic clinical briefing: symptoms timeline, active drugs,
    detected safety flags, and AI-assisted clinical triage recommendations.
    Authorized via Cedar Policy rule 4 (Certified Clinician / Doctor role).
    """
    doctor_id = current_user.get("doctor_id", "DOC-77")
    return DoctorDashboardService.get_patient_clinical_summary(patient_id, doctor_id)

