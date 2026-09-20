from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SymptomEntryRequest(BaseModel):
    patient_id: str = Field(..., example="P-101")
    symptoms: str = Field(..., example="Severe throbbing headache, fever 102F and light sensitivity since yesterday")
    duration_days: Optional[int] = Field(1, example=1)
    severity_self_rating: Optional[int] = Field(7, ge=1, le=10, description="1-10 self rating")
    age: Optional[int] = Field(35, example=35)
    existing_conditions: Optional[List[str]] = Field(default_factory=list, example=["Hypertension"])

class AnsweredQuestion(BaseModel):
    question_id: str
    question_text: str
    selected_option: str

class AdaptiveQARequest(BaseModel):
    patient_id: str = Field(..., example="P-101")
    primary_symptoms: str
    answers_so_far: List[AnsweredQuestion] = Field(default_factory=list)

class AdaptiveQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    context: Optional[str] = None

class FinalRiskRequest(BaseModel):
    entry: SymptomEntryRequest
    answers: List[AnsweredQuestion] = Field(default_factory=list)

class RiskAssessmentResponse(BaseModel):
    patient_id: str
    primary_symptoms: str
    risk_category: str = Field(..., description="EMERGENCY, HIGH_RISK, MODERATE_RISK, or LOW_RISK")
    risk_score: int = Field(..., ge=0, le=100)
    summary: str
    red_flags_detected: List[str]
    triage_guidance: str
    recommended_action: str
    estimated_wait_window: str
    adaptive_followup_complete: bool
    disease_findings: List[Dict[str, str]] = Field(default_factory=list)

