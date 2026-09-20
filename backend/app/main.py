from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.modules.symptom_intelligence.router import router as symptom_router
from app.modules.prescription_intelligence.router import router as rx_router
from app.modules.medication_safety.router import router as safety_router
from app.modules.health_timeline.router import router as timeline_router
from app.modules.emergency_card.router import router as emergency_router
from app.modules.alerts_followup.router import router as alerts_router
from app.modules.family_profiles.router import router as family_router
from app.modules.doctor_dashboard.router import router as doctor_router
from app.modules.localization.router import router as localization_router
from app.modules.health_chatbot.router import router as health_chat_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    # CareSphere Backend
    An intelligent, cloud-native healthcare platform supporting:
    - **Module 1**: Symptom Intelligence (Adaptive Q&A + Clinical Risk Triage)
    - **Module 2**: Prescription Intelligence & Digital Vault (Bedrock OCR + Clean Medication Schedule)
    - **Module 3**: Medication Safety Engine (Duplicate Brand Resolver + Drug Interaction Engine + Explainable AI)
    - **Module 4**: Health Timeline (DynamoDB Unified Chronological Record)
    - **Module 5**: Emergency Health Card (Scannable QR Code + Public First-Responder View)
    - **Module 6**: Alerts + Follow-up (Missed Doctor Check-ins, Red-flag Alerts, Smart Reminders)
    - **Additional**: Family Health Profiles, Doctor Dashboard, Multi-language Medical Simplifier (Hindi/Regional).
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for React Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Module Routers under API v1
api_prefix = settings.API_V1_STR
app.include_router(symptom_router, prefix=api_prefix)
app.include_router(rx_router, prefix=api_prefix)
app.include_router(safety_router, prefix=api_prefix)
app.include_router(timeline_router, prefix=api_prefix)
app.include_router(emergency_router, prefix=api_prefix)
app.include_router(alerts_router, prefix=api_prefix)
app.include_router(family_router, prefix=api_prefix)
app.include_router(doctor_router, prefix=api_prefix)
app.include_router(localization_router, prefix=api_prefix)
app.include_router(health_chat_router, prefix=api_prefix)

@app.get("/", tags=["Health"])
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
        "aws_mode": "Live AWS Services" if not settings.AWS_MOCK_MODE else "Local Simulation / Fallback Mode",
        "region": settings.AWS_REGION
    }

@app.get("/healthz", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "caresphere-healthcare-backend"}

