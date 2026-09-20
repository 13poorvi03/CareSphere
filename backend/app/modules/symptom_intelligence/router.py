from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from app.modules.symptom_intelligence.schemas import (
    SymptomEntryRequest, AdaptiveQARequest, AdaptiveQuestion, RiskAssessmentResponse, AnsweredQuestion, FinalRiskRequest
)
from app.modules.symptom_intelligence.service import SymptomIntelligenceService
from app.core.security import get_current_user

router = APIRouter(prefix="/symptoms", tags=["1. Symptom Intelligence"])

@router.post("/analyze", response_model=RiskAssessmentResponse)
async def analyze_symptoms(
    payload: SymptomEntryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Primary endpoint for symptom entry. Analyzes symptoms, flags emergency red flags,
    and returns initial risk score and triage categorization.
    """
    return SymptomIntelligenceService.assess_risk(payload)

@router.post("/adaptive-qa", response_model=List[AdaptiveQuestion])
async def get_adaptive_qa(
    payload: AdaptiveQARequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generates intelligent, context-driven follow-up questions based on entered symptoms
    and preceding patient answers to narrow clinical uncertainty.
    """
    return SymptomIntelligenceService.get_adaptive_questions(payload)

@router.post("/assess-final-risk", response_model=RiskAssessmentResponse)
async def assess_final_risk(
    payload: FinalRiskRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Computes final risk category integrating patient's initial symptoms plus
    all answered adaptive follow-up questions.
    """
    return SymptomIntelligenceService.assess_risk(payload.entry, answers=payload.answers)

