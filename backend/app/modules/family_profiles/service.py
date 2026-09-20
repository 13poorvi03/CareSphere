from typing import List, Dict, Any
from app.modules.family_profiles.schemas import FamilyMemberProfile, FamilyProfilesResponse

FAMILY_DATABASE: Dict[str, List[FamilyMemberProfile]] = {
    "FAM-99": [
        FamilyMemberProfile(
            patient_id="P-101",
            family_id="FAM-99",
            name="Rajesh Sharma",
            relationship="Self",
            age=42,
            gender="Male",
            blood_group="B+",
            critical_alerts_count=1,
            active_meds_count=3,
            is_primary_account=True
        ),
        FamilyMemberProfile(
            patient_id="P-102",
            family_id="FAM-99",
            name="Ramesh Sharma",
            relationship="Father",
            age=72,
            gender="Male",
            blood_group="O+",
            critical_alerts_count=0,
            active_meds_count=4,
            is_primary_account=False
        ),
        FamilyMemberProfile(
            patient_id="P-103",
            family_id="FAM-99",
            name="Sunita Sharma",
            relationship="Mother",
            age=68,
            gender="Female",
            blood_group="A+",
            critical_alerts_count=0,
            active_meds_count=2,
            is_primary_account=False
        ),
        FamilyMemberProfile(
            patient_id="P-104",
            family_id="FAM-99",
            name="Aarav Sharma",
            relationship="Child",
            age=9,
            gender="Male",
            blood_group="B+",
            critical_alerts_count=0,
            active_meds_count=1,
            is_primary_account=False
        )
    ]
}

class FamilyProfilesService:
    @classmethod
    def get_family_members(cls, family_id: str = "FAM-99") -> FamilyProfilesResponse:
        members = FAMILY_DATABASE.get(family_id, FAMILY_DATABASE["FAM-99"])
        return FamilyProfilesResponse(
            family_id=family_id,
            primary_patient_id="P-101",
            members=members
        )

