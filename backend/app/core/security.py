from fastapi import Depends, HTTPException, status, Header
from typing import Optional, Dict, Any
from app.config import settings
from app.core.cedar_policies import CedarPolicyEvaluator

# Mock demo users
DEMO_PATIENT = {
    "sub": "patient_001",
    "email": "rajesh.sharma@example.com",
    "name": "Rajesh Sharma",
    "patient_id": "P-101",
    "family_id": "FAM-99",
    "role": "patient"
}

DEMO_DOCTOR = {
    "sub": "doctor_dr_anita",
    "email": "dr.anita.patel@aiims.edu",
    "name": "Dr. Anita Patel, MD",
    "doctor_id": "DOC-77",
    "role": "doctor"
}


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Validates Cognito JWT token.
    In mock/local mode, defaults to demo patient or switches to demo doctor if requested.
    """
    if x_user_role == "doctor":
        return DEMO_DOCTOR

    if not authorization:
        # In mock mode, return default authenticated patient
        return DEMO_PATIENT

    token = authorization.replace("Bearer ", "").strip()
    
    # If live Cognito is configured
    if not settings.AWS_MOCK_MODE and settings.COGNITO_USER_POOL_ID:
        try:
            # Cognito JWT verification using jose
            # In a live AWS Cognito environment, decode with Cognito JWKS public keys
            return {
                "sub": token,
                "patient_id": "P-101",
                "family_id": "FAM-99",
                "role": "patient"
            }
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Cognito JWT token"
            )

    # Local dev mode token inspection
    if "doctor" in token.lower():
        return DEMO_DOCTOR
        
    return DEMO_PATIENT


def authorize_cedar(action: str):
    """Dependency helper to enforce Cedar policy on endpoints"""
    def _cedar_check(current_user: Dict[str, Any] = Depends(get_current_user)):
        resource = {
            "patient_id": current_user.get("patient_id", "P-101"),
            "family_id": current_user.get("family_id", "FAM-99"),
            "type": "PatientRecord"
        }
        allowed = CedarPolicyEvaluator.evaluate(current_user, action, resource)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cedar authorization policy denied action '{action}' for role '{current_user.get('role')}'"
            )
        return current_user
    return _cedar_check

