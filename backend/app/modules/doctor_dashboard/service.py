import logging
from datetime import datetime, timezone
from typing import Dict, Any
from app.modules.doctor_dashboard.schemas import DoctorClinicalSummary
from app.modules.health_timeline.service import HealthTimelineService
from app.modules.medication_safety.service import MedicationSafetyService
from app.modules.medication_safety.schemas import MedicineItem, MedicationSafetyAuditRequest
from app.modules.emergency_card.service import PATIENT_EMERGENCY_PROFILES

logger = logging.getLogger(__name__)

class DoctorDashboardService:
    @classmethod
    def get_patient_clinical_summary(
        cls,
        patient_id: str,
        doctor_id: str = "DOC-77"
    ) -> DoctorClinicalSummary:
        """
        Synthesizes complete clinical dossier for physician review:
        1. Patient vitals & emergency profile.
        2. Symptoms progression timeline.
        3. Active drug regimen.
        4. Real-time safety engine audit (duplicate salts + interactions).
        5. AI-assisted clinical triage recommendations.
        """
        patient_info = PATIENT_EMERGENCY_PROFILES.get(patient_id, PATIENT_EMERGENCY_PROFILES["P-101"])
        
        # Pull recent timeline
        timeline_resp = HealthTimelineService.get_patient_timeline(patient_id)
        
        # Test active meds for safety issues
        active_meds = [
            MedicineItem(brand_name="Dolo 650", generic_name="Paracetamol", strength="650mg"),
            MedicineItem(brand_name="Augmentin 625 Duo", generic_name="Amoxicillin + Clavulanic Acid", strength="625mg"),
            MedicineItem(brand_name="Disprin", generic_name="Aspirin", strength="350mg"),
            MedicineItem(brand_name="Warf 5", generic_name="Warfarin", strength="5mg")
        ]
        
        safety_audit = MedicationSafetyService.audit_medications(
            MedicationSafetyAuditRequest(patient_id=patient_id, medicines=active_meds)
        )

        detected_issues = []
        for d in safety_audit.duplicate_alerts:
            detected_issues.append({
                "type": "DUPLICATE_ACTIVE_INGREDIENT",
                "severity": d.severity,
                "detail": f"{d.active_salt} duplication: {', '.join(d.conflicting_brands)}",
                "action": d.action
            })
        for i in safety_audit.interaction_alerts:
            detected_issues.append({
                "type": "DRUG_DRUG_INTERACTION",
                "severity": i.severity,
                "detail": f"{i.drug_a} + {i.drug_b} Interaction",
                "action": i.action
            })

        return DoctorClinicalSummary(
            doctor_id=doctor_id,
            doctor_name="Dr. Anita Patel, MD",
            patient_id=patient_id,
            patient_name=patient_info["full_name"],
            age=patient_info["age"],
            gender=patient_info["gender"],
            blood_group=patient_info["blood_group"],
            chief_complaint="Throbbing headache, intermittent fever 102F, and prescription reconciliation review",
            triage_level="HIGH_RISK",
            current_active_medications=[
                {"name": "Dolo 650", "salt": "Paracetamol", "dosage": "650mg", "freq": "1-0-1"},
                {"name": "Augmentin 625", "salt": "Amoxicillin + Clavulanic Acid", "dosage": "625mg", "freq": "1-0-1"},
                {"name": "Disprin", "salt": "Aspirin", "dosage": "350mg", "freq": "SOS"},
                {"name": "Warf 5", "salt": "Warfarin", "dosage": "5mg", "freq": "0-0-1"}
            ],
            detected_safety_issues=detected_issues,
            recent_symptoms_timeline=[ev.model_dump() for ev in timeline_resp.events[:4]],
            clinical_recommendations=[
                "CRITICAL: Discontinue concurrent Disprin (Aspirin) immediately due to severe bleeding risk with Warfarin.",
                "Check baseline PT / INR blood levels before confirming anticoagulant continuation.",
                "Verify penicillin allergy history before starting Augmentin 625 Duo."
            ],
            last_consultation_date="2026-09-15"
        )

