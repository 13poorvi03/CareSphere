import io
import json
import base64
import qrcode
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.core.aws_clients import get_s3_client, get_dynamodb_resource
from app.config import settings
from app.modules.emergency_card.schemas import EmergencyCardData, EmergencyContact

logger = logging.getLogger(__name__)

# Patient registry for demo profiles
PATIENT_EMERGENCY_PROFILES: Dict[str, Dict[str, Any]] = {
    "P-101": {
        "patient_id": "P-101",
        "full_name": "Rajesh Sharma",
        "date_of_birth": "1984-06-15",
        "age": 42,
        "gender": "Male",
        "blood_group": "B+ (Positive)",
        "organ_donor": True,
        "chronic_conditions": ["Mild Hypertension (controlled)"],
        "critical_allergies": ["Penicillin (Severe Anaphylaxis)", "Sulfa drugs"],
        "current_active_medications": ["Telma 40 (Telmisartan 40mg OD)", "Dolo 650 (SOS)", "Pan 40"],
        "emergency_contacts": [
            {
                "name": "Pooja Sharma",
                "relationship": "Spouse",
                "phone": "+91-98765-43210",
                "alternate_phone": "+91-98765-43211"
            },
            {
                "name": "Dr. Anita Patel",
                "relationship": "Primary Physician",
                "phone": "+91-99887-76655",
                "alternate_phone": None
            }
        ],
        "special_medical_instructions": "DO NOT ADMINISTER AMOXICILLIN OR PENICILLIN DERIVATIVES. IN CASE OF UNCONSCIOUSNESS, CHECK BP AND ADMINISTER IV SALINE ONLY.",
        "last_updated": "2026-09-18T10:00:00Z"
    },
    "P-102": {
        "patient_id": "P-102",
        "full_name": "Ramesh Sharma (Father)",
        "date_of_birth": "1954-03-22",
        "age": 72,
        "gender": "Male",
        "blood_group": "O+ (Positive)",
        "organ_donor": False,
        "chronic_conditions": ["Type 2 Diabetes Mellitus", "Coronary Artery Disease (Stent 2021)"],
        "critical_allergies": ["NSAIDs (Bronchospasm risk)", "Contrast Dye"],
        "current_active_medications": ["Glycomet 500 (Metformin)", "Ecosprin 75", "Atorva 20"],
        "emergency_contacts": [
            {
                "name": "Rajesh Sharma",
                "relationship": "Son",
                "phone": "+91-98111-22334",
                "alternate_phone": None
            }
        ],
        "special_medical_instructions": "Diabetic patient on oral hypoglycemics. Check capillary blood glucose immediately.",
        "last_updated": "2026-09-18T09:30:00Z"
    }
}

class EmergencyCardService:
    @classmethod
    def get_emergency_card(cls, patient_id: str, host_url: str = "http://localhost:5173") -> EmergencyCardData:
        """
        Generates minimal emergency info card and dynamic scannable QR Code.
        """
        profile = PATIENT_EMERGENCY_PROFILES.get(patient_id, PATIENT_EMERGENCY_PROFILES["P-101"])
        
        # Public URL accessed when QR is scanned by paramedic or bystander
        public_url = f"{host_url}/emergency/{patient_id}"
        
        # Minimal payload embedded directly in QR code for offline scanning capability
        offline_qr_payload = {
            "id": profile["patient_id"],
            "name": profile["full_name"],
            "blood": profile["blood_group"],
            "allergies": profile["critical_allergies"],
            "meds": profile["current_active_medications"],
            "ice": profile["emergency_contacts"][0]["phone"],
            "url": public_url
        }

        # Generate QR code PNG
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(json.dumps(offline_qr_payload))
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1E3A8A", back_color="#FFFFFF")

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()

        # Save to S3
        s3 = get_s3_client()
        s3_key = f"emergency_qr/{patient_id}_qr.png"
        try:
            s3.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key,
                Body=png_bytes,
                ContentType="image/png"
            )
            qr_s3_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
        except Exception:
            qr_s3_url = None

        base64_qr = f"data:image/png;base64,{base64.b64encode(png_bytes).decode('utf-8')}"

        card_data = EmergencyCardData(
            patient_id=profile["patient_id"],
            full_name=profile["full_name"],
            date_of_birth=profile["date_of_birth"],
            age=profile["age"],
            gender=profile["gender"],
            blood_group=profile["blood_group"],
            organ_donor=profile.get("organ_donor", True),
            chronic_conditions=profile["chronic_conditions"],
            critical_allergies=profile["critical_allergies"],
            current_active_medications=profile["current_active_medications"],
            emergency_contacts=[EmergencyContact(**c) for c in profile["emergency_contacts"]],
            special_medical_instructions=profile.get("special_medical_instructions"),
            qr_code_url=base64_qr,
            public_emergency_url=public_url,
            last_updated=profile.get("last_updated", datetime.now(timezone.utc).isoformat())
        )

        return card_data

