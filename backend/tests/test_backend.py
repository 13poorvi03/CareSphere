import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_and_healthz():
    res = client.get("/")
    assert res.status_code == 200
    assert "CareSphere" in res.json()["platform"]
    
    h_res = client.get("/healthz")
    assert h_res.status_code == 200
    assert h_res.json()["status"] == "healthy"

def test_module_1_symptom_intelligence():
    # 1. Symptom Entry & Initial Analysis
    payload = {
        "patient_id": "P-101",
        "symptoms": "High fever 102F and severe headache with throat pain",
        "duration_days": 2,
        "severity_self_rating": 7
    }
    res = client.post("/api/v1/symptoms/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["patient_id"] == "P-101"
    assert data["risk_category"] in ["LOW_RISK", "MODERATE_RISK", "HIGH_RISK", "EMERGENCY"]
    assert data["risk_score"] > 0
    assert "triage_guidance" in data

    # 2. Emergency Red Flag Detection
    emergency_payload = {
        "patient_id": "P-101",
        "symptoms": "Sudden crushing chest pain radiating to left arm and shortness of breath",
        "duration_days": 1
    }
    emg_res = client.post("/api/v1/symptoms/analyze", json=emergency_payload)
    assert emg_res.status_code == 200
    emg_data = emg_res.json()
    assert emg_data["risk_category"] == "EMERGENCY"
    assert len(emg_data["red_flags_detected"]) > 0

    # 3. Adaptive Q&A
    qa_payload = {
        "patient_id": "P-101",
        "primary_symptoms": "Fever and body chills"
    }
    qa_res = client.post("/api/v1/symptoms/adaptive-qa", json=qa_payload)
    assert qa_res.status_code == 200
    questions = qa_res.json()
    assert len(questions) > 0
    assert "question" in questions[0]
    assert len(questions[0]["options"]) > 0

    unfamiliar_qa = client.post("/api/v1/symptoms/adaptive-qa", json={
        "patient_id": "P-101",
        "primary_symptoms": "burning urination and lower back discomfort",
    })
    assert unfamiliar_qa.status_code == 200
    assert any("urinary" in (question.get("context") or "") for question in unfamiliar_qa.json())

    unfamiliar_assessment = client.post("/api/v1/symptoms/analyze", json={
        "patient_id": "P-101",
        "symptoms": "new itchy rash after using a different soap",
        "duration_days": 1,
        "severity_self_rating": 4,
    })
    assert unfamiliar_assessment.status_code == 200
    assert len(unfamiliar_assessment.json()["disease_findings"]) > 0

def test_module_2_prescription_intelligence():
    # Prescription Upload & OCR schedule extraction
    file_content = b"Sample Doctor Prescription: Dolo 650, Augmentin 625 Duo, Pan 40"
    res = client.post(
        "/api/v1/prescriptions/upload",
        files={"file": ("prescription_dr_anita.jpg", file_content, "image/jpeg")},
        data={"patient_id": "P-101"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "prescription_id" in data
    assert len(data["extracted_medicines"]) >= 3
    assert len(data["clean_schedule"]["schedule_slots"]) == 4

    # Digital Prescription Vault
    vault_res = client.get("/api/v1/prescriptions/vault/P-101")
    assert vault_res.status_code == 200
    assert len(vault_res.json()) > 0

def test_module_3_medication_safety_engine():
    # 1. Duplicate active ingredient check: Crocin Advance + Dolo 650 (Both Paracetamol)
    audit_payload = {
        "patient_id": "P-101",
        "medicines": [
            {"brand_name": "Dolo 650", "generic_name": "Paracetamol", "strength": "650mg"},
            {"brand_name": "Crocin Advance", "generic_name": "Paracetamol", "strength": "500mg"}
        ]
    }
    res = client.post("/api/v1/safety/audit", json=audit_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_safe"] is False
    assert len(data["duplicate_alerts"]) > 0
    dup = data["duplicate_alerts"][0]
    assert dup["active_salt"].lower() == "paracetamol"
    assert dup["why"] != ""
    assert dup["concern"] != ""
    assert dup["action"] != ""

    # 2. Drug-Drug Interaction Check: Warfarin + Aspirin (Disprin)
    ddi_payload = {
        "patient_id": "P-101",
        "medicines": [
            {"brand_name": "Warf 5", "generic_name": "Warfarin"},
            {"brand_name": "Disprin", "generic_name": "Aspirin"}
        ]
    }
    ddi_res = client.post("/api/v1/safety/audit", json=ddi_payload)
    assert ddi_res.status_code == 200
    ddi_data = ddi_res.json()
    assert ddi_data["is_safe"] is False
    assert len(ddi_data["interaction_alerts"]) > 0
    inter = ddi_data["interaction_alerts"][0]
    assert inter["severity"] == "CRITICAL"
    assert inter["why"] != ""
    assert inter["concern"] != ""
    assert inter["action"] != ""

def test_module_4_health_timeline():
    res = client.get("/api/v1/timeline/P-101")
    assert res.status_code == 200
    data = res.json()
    assert data["patient_id"] == "P-101"
    assert data["total_events"] > 0
    assert len(data["events"]) > 0

    # Log new event
    new_event = {
        "patient_id": "P-101",
        "event_type": "CLINICAL_CONSULT",
        "title": "Teleconsultation Follow-up",
        "description": "Reviewed sore throat recovery with ENT specialist."
    }
    post_res = client.post("/api/v1/timeline/events", json=new_event)
    assert post_res.status_code == 200
    assert post_res.json()["title"] == new_event["title"]

def test_module_5_emergency_health_card():
    res = client.get("/api/v1/emergency/card/P-101")
    assert res.status_code == 200
    data = res.json()
    assert data["patient_id"] == "P-101"
    assert data["blood_group"] != ""
    assert len(data["critical_allergies"]) > 0
    assert data["qr_code_url"].startswith("data:image/png;base64,")

    # Unauthenticated Public Emergency View
    pub_res = client.get("/api/v1/emergency/public/P-101")
    assert pub_res.status_code == 200
    assert pub_res.json()["full_name"] == data["full_name"]

def test_module_6_alerts_and_followup():
    res = client.get("/api/v1/alerts/P-101")
    assert res.status_code == 200
    data = res.json()
    assert data["total_active_alerts"] > 0
    
    # Take medication reminder action
    action_payload = {
        "alert_id": data["alerts"][0]["id"],
        "action": "TAKEN"
    }
    act_res = client.post("/api/v1/alerts/reminder-action", json=action_payload)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "TAKEN"

def test_family_profiles():
    res = client.get("/api/v1/family/FAM-99")
    assert res.status_code == 200
    data = res.json()
    assert len(data["members"]) >= 4
    relationships = [m["relationship"] for m in data["members"]]
    assert "Self" in relationships
    assert "Father" in relationships
    assert "Mother" in relationships

def test_doctor_dashboard():
    # Request as doctor
    res = client.get("/api/v1/doctor/summary/P-101", headers={"x-user-role": "doctor"})
    assert res.status_code == 200
    data = res.json()
    assert data["doctor_name"] == "Dr. Anita Patel, MD"
    assert len(data["detected_safety_issues"]) > 0
    assert len(data["clinical_recommendations"]) > 0

def test_medical_simplifier_localization():
    payload = {
        "medical_text": "Patient exhibits acute pharyngitis and mild hypertension. Prescribed Amoxicillin-clavulanate 625mg b.i.d.",
        "target_language": "hindi"
    }
    res = client.post("/api/v1/translate/simplify", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["target_language"] == "hindi"
    assert len(data["regional_language_translation"]) > 0
    assert len(data["key_takeaways"]) > 0

