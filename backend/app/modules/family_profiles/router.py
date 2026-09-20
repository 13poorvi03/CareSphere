from fastapi import APIRouter, Depends
from app.modules.family_profiles.schemas import FamilyProfilesResponse
from app.modules.family_profiles.service import FamilyProfilesService
from app.core.security import get_current_user

router = APIRouter(prefix="/family", tags=["Family Health Profiles"])

@router.get("/{family_id}", response_model=FamilyProfilesResponse)
async def get_family_profiles(
    family_id: str = "FAM-99",
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves all linked family member profiles (Self, Father, Mother, Child)
    allowing instant switching of health records within a household.
    """
    return FamilyProfilesService.get_family_members(family_id)

