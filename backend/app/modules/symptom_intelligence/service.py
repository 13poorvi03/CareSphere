import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.core.aws_clients import get_bedrock_client, TRIAGE_DATA, get_dynamodb_resource
from app.config import settings
from app.modules.symptom_intelligence.schemas import (
    SymptomEntryRequest, AdaptiveQARequest, AdaptiveQuestion, RiskAssessmentResponse, AnsweredQuestion
)

logger = logging.getLogger(__name__)

class SymptomIntelligenceService:
    INPUT_QUESTION_PROFILES = [
        ("breathing", ("shortness of breath", "breathless", "wheezing", "breathing"), [
            ("breathing_onset", "When did the breathing symptom start, and is it getting worse?", ["Sudden and worsening", "Sudden but stable", "Gradual onset", "Not sure"]),
            ("breathing_activity", "Does it happen at rest, during activity, or when lying down?", ["At rest", "With activity", "When lying down", "None of these"]),
            ("breathing_associated", "Do you have chest pain, blue lips, fever, or faintness with it?", ["Yes, one or more", "No", "Not sure"]),
        ]),
        ("stomach", ("stomach pain", "abdominal", "belly pain", "diarrhea", "vomiting", "nausea"), [
            ("stomach_location", "Where is the discomfort, and is it constant or coming in waves?", ["Upper abdomen", "Lower abdomen", "All over", "Comes in waves"]),
            ("stomach_intake", "Can you keep down fluids and food?", ["Yes", "Only small amounts", "No, I keep vomiting", "Not sure"]),
            ("stomach_warning", "Have you noticed blood, black stool, severe tenderness, or faintness?", ["Yes", "No", "Not sure"]),
        ]),
        ("urinary", ("burning urination", "painful urination", "urinating", "urine", "flank pain"), [
            ("urinary_duration", "How long have the urinary symptoms been present?", ["Less than a day", "1-3 days", "More than 3 days", "Not sure"]),
            ("urinary_features", "Do you have fever, back/flank pain, blood in urine, or frequent urination?", ["Yes, one or more", "No", "Not sure"]),
            ("urinary_pregnancy", "Could pregnancy be relevant to this symptom?", ["Yes", "No", "Not applicable", "Prefer not to say"]),
        ]),
        ("skin", ("rash", "itching", "hives", "skin", "swelling"), [
            ("skin_onset", "When did the skin change start, and is it spreading?", ["Today and spreading", "Today but stable", "Several days", "Not sure"]),
            ("skin_trigger", "Did it follow a new food, medicine, product, or insect bite?", ["Food", "Medicine", "Product or bite", "No known trigger"]),
            ("skin_warning", "Do you have facial swelling, mouth swelling, or trouble breathing?", ["Yes", "No", "Not sure"]),
        ]),
    ]

    @classmethod
    def _matching_dynamo_symptoms(cls, symptom_text: str) -> List[Dict[str, Any]]:
        """Read seeded symptom knowledge from DynamoDB when the table is available."""
        try:
            table = get_dynamodb_resource().Table(settings.DYNAMODB_TABLE_RECORDS)
            items = table.scan().get("Items", [])
            terms = set(symptom_text.lower().split())
            return [
                item for item in items
                if item.get("event_type") in {"SYMPTOM_KNOWLEDGE", "SYMPTOM_ENTRY"}
                and terms.intersection(set(str(item.get("symptoms", item.get("description", ""))).lower().split()))
            ]
        except Exception as exc:
            logger.warning("DynamoDB symptom lookup unavailable: %s", exc)
            return []

    @classmethod
    def get_adaptive_questions(cls, req: AdaptiveQARequest) -> List[AdaptiveQuestion]:
        """
        Dynamically extracts appropriate follow-up questions based on patient's symptoms
        and previous answers, consulting Bedrock / triage clinical rules.
        """
        symptom_text = req.primary_symptoms.lower()
        answered_ids = {a.question_id for a in req.answers_so_far}
        questions: List[AdaptiveQuestion] = []
        seen_ids = set(answered_ids)
        matched_rule = False

        for item in cls._matching_dynamo_symptoms(symptom_text):
            matched_rule = True
            for question in item.get("adaptive_questions", []):
                question_id = question.get("id")
                if question_id and question_id not in seen_ids:
                    questions.append(AdaptiveQuestion(**question))
                    seen_ids.add(question_id)

        # Check keyword matches in curated triage data
        for category in TRIAGE_DATA.get("adaptive_questions", []):
            if any(k in symptom_text for k in category.get("match_keywords", [])):
                matched_rule = True
                for q in category.get("questions", []):
                    if q["id"] not in seen_ids:
                        questions.append(
                            AdaptiveQuestion(
                                id=q["id"],
                                question=q["question"],
                                options=q["options"],
                                context=f"Follow-up for {category['condition_tag']}"
                            )
                        )
                        seen_ids.add(q["id"])

        # Add focused questions for common symptom domains not yet in curated rules.
        if not matched_rule:
            for condition_tag, keywords, profile_questions in cls.INPUT_QUESTION_PROFILES:
                if any(keyword in symptom_text for keyword in keywords):
                    matched_rule = True
                    for question_id, question, options in profile_questions:
                        if question_id not in seen_ids:
                            questions.append(AdaptiveQuestion(
                                id=question_id,
                                question=question,
                                options=options,
                                context=f"Follow-up for {condition_tag} symptoms",
                            ))
                    break

        # Use the user's own description to make fallback questions relevant.
        if not questions and not matched_rule:
            symptom_label = req.primary_symptoms.strip().rstrip(".!?")
            general_pool = [
                AdaptiveQuestion(
                    id="gen_progression",
                    question=f"When did {symptom_label} start, and is it getting better or worse?",
                    options=["Rapidly getting worse", "Gradually worsening", "Staying about the same", "Slowly improving"],
                    context="General progression assessment"
                ),
                AdaptiveQuestion(
                    id="gen_daily_impact",
                    question=f"Where do you feel {symptom_label}, and how much does it affect daily activities or sleep?",
                    options=["Unable to walk, work or sleep", "Difficulty with routine tasks", "Mild discomfort, manageable"],
                    context="Functional impairment"
                ),
                AdaptiveQuestion(
                    id="gen_med_relief",
                    question=f"What makes {symptom_label} better or worse, and have you tried any medicine or home remedy?",
                    options=["Yes, but got no relief", "Yes, temporary partial relief", "Haven't taken any medicine yet"],
                    context="Prior intervention response"
                )
            ]
            questions = [q for q in general_pool if q.id not in answered_ids]

        # Keep the focused conversation short while covering the requested clinical dimensions.
        return questions[:4]

    @classmethod
    def assess_risk(
        cls,
        entry: SymptomEntryRequest,
        answers: Optional[List[AnsweredQuestion]] = None
    ) -> RiskAssessmentResponse:
        """
        Computes clinical risk category (EMERGENCY, HIGH_RISK, MODERATE_RISK, LOW_RISK),
        detects red flags, and logs the event to the Health Timeline.
        """
        symptoms_lower = entry.symptoms.lower()
        red_flags_detected = []
        highest_score = 15  # baseline low risk
        triage_guidance = "Monitor symptoms at home. Stay hydrated and rest."
        recommended_action = "Consult a general physician if symptoms persist beyond 48 hours."
        estimated_wait = "Within 48-72 hours"

        # Check Red Flags from triage data
        for rf in TRIAGE_DATA.get("red_flags", []):
            if any(term in symptoms_lower for term in rf.get("trigger_terms", [])):
                red_flags_detected.append(rf["warning"])
                if rf["risk_score"] > highest_score:
                    highest_score = rf["risk_score"]
                    triage_guidance = rf["triage_guidance"]

        # Incorporate answered questions if provided
        if answers:
            for ans in answers:
                opt_lower = ans.selected_option.lower()
                if "sudden explosive" in opt_lower or "worst of my life" in opt_lower:
                    highest_score = max(highest_score, 96)
                    red_flags_detected.append("Thunderclap onset headache - rule out Subarachnoid Hemorrhage.")
                    triage_guidance = "Emergency Room urgent transfer."
                elif "rebound tenderness" in opt_lower:
                    highest_score = max(highest_score, 88)
                    red_flags_detected.append("Peritoneal irritation / acute abdomen signs.")
                elif "rapidly getting worse" in opt_lower:
                    highest_score += 15
                elif "above 102" in opt_lower:
                    highest_score += 10
                elif "blood-tinged" in opt_lower:
                    highest_score = max(highest_score, 82)
                    red_flags_detected.append("Hemoptysis / blood-tinged sputum.")
                elif "very high" in opt_lower or "vomiting, confusion" in opt_lower:
                    highest_score = max(highest_score, 78)
                    red_flags_detected.append("Possible severe hyperglycemia warning signs.")

        # Determine Category
        if highest_score >= 90:
            category = "EMERGENCY"
            recommended_action = "Call Emergency Services (108/112) or go to the nearest Emergency Room IMMEDIATELY."
            estimated_wait = "Immediate / 0 minutes"
        elif highest_score >= 70:
            category = "HIGH_RISK"
            recommended_action = "Seek in-person urgent care clinic or same-day medical specialist consultation."
            estimated_wait = "Within 2-4 hours"
        elif highest_score >= 40:
            category = "MODERATE_RISK"
            recommended_action = "Schedule an appointment with your family doctor / GP within 24 hours."
            estimated_wait = "Within 24 hours"
        else:
            category = "LOW_RISK"
            recommended_action = "Symptomatic self-care, oral rehydration, and rest. Re-evaluate if condition deteriorates."
            estimated_wait = "Self-care / non-urgent"

        disease_findings = cls._build_disease_findings(entry, answers or [], symptoms_lower)

        # Construct summary
        summary = (
            f"Clinical triage completed for {entry.patient_id}. Identified risk level: {category} "
            f"(Score: {min(highest_score, 100)}/100)."
        )

        response = RiskAssessmentResponse(
            patient_id=entry.patient_id,
            primary_symptoms=entry.symptoms,
            risk_category=category,
            risk_score=min(highest_score, 100),
            summary=summary,
            red_flags_detected=red_flags_detected,
            triage_guidance=triage_guidance,
            recommended_action=recommended_action,
            estimated_wait_window=estimated_wait,
            adaptive_followup_complete=bool(answers and len(answers) >= 2),
            disease_findings=disease_findings
        )

        # Automatically log to health timeline DynamoDB
        cls._log_to_timeline(entry.patient_id, response, answers or [])

        return response

    @classmethod
    def _build_disease_findings(
        cls,
        entry: SymptomEntryRequest,
        answers: List[AnsweredQuestion],
        symptoms_lower: str,
    ) -> List[Dict[str, str]]:
        """Combine transparent rules with an optional Bedrock explanation."""
        findings: List[Dict[str, str]] = []
        if "headache" in symptoms_lower or "migraine" in symptoms_lower:
            findings.append({
                "concern": "Migraine or another headache disorder",
                "why": "Head pain was reported; throbbing pain, visual symptoms, nausea, or light sensitivity increase concern.",
                "action": "Arrange a clinician review, and seek urgent care for sudden explosive pain or new neurological symptoms.",
            })
        if "diabetes" in symptoms_lower or "high sugar" in symptoms_lower or "high diabetes" in symptoms_lower:
            findings.append({
                "concern": "Diabetes-related complication or uncontrolled blood sugar",
                "why": "The description mentions diabetes or elevated blood sugar; duration, medicines, readings, and vision changes matter.",
                "action": "Check glucose if available and contact your diabetes clinician; seek urgent care for confusion, vomiting, or severe weakness.",
            })
        if "high blood pressure" in symptoms_lower or "hypertension" in symptoms_lower:
            findings.append({
                "concern": "Uncontrolled hypertension",
                "why": "High blood pressure was reported and can become more concerning with severe headache, chest pain, or vision changes.",
                "action": "Repeat the reading after resting and contact a clinician; seek emergency care for chest pain, weakness, or vision loss.",
            })
        if "fever" in symptoms_lower or "temperature" in symptoms_lower or "chills" in symptoms_lower:
            findings.append({
                "concern": "An acute infection or febrile illness",
                "why": "Fever, temperature elevation, or chills suggest the immune system is responding to an illness; duration and associated cough, rash, or breathing symptoms help narrow the category.",
                "action": "Hydrate, rest, monitor temperature, and arrange medical review if it persists or worsens; seek urgent care for confusion, stiff neck, breathing difficulty, or dehydration.",
            })
        if "cough" in symptoms_lower or "phlegm" in symptoms_lower or "wheezing" in symptoms_lower:
            findings.append({
                "concern": "An upper or lower respiratory illness",
                "why": "Cough, mucus, or wheezing can occur with viral infections, asthma, or other airway conditions; breathing difficulty and blood in sputum increase concern.",
                "action": "Rest and drink fluids while monitoring breathing; seek urgent care for shortness of breath at rest, blue lips, chest pain, or blood in sputum.",
            })

        if "sore throat" in symptoms_lower or "throat pain" in symptoms_lower:
            findings.append({
                "concern": "Throat infection or irritation",
                "why": "Throat pain was reported; fever, cough, swollen glands, and difficulty swallowing help distinguish common causes.",
                "action": "Drink fluids and rest; arrange medical review if symptoms persist, worsen, or make swallowing or breathing difficult.",
            })
        if any(term in symptoms_lower for term in ("stomach", "abdominal", "belly", "nausea", "vomit", "diarrhea")):
            findings.append({
                "concern": "Gastrointestinal illness or irritation",
                "why": "Digestive symptoms were reported; location, hydration, food tolerance, fever, and blood are important warning clues.",
                "action": "Take small frequent fluids and seek care for severe pain, dehydration, persistent vomiting, faintness, or blood.",
            })
        if any(term in symptoms_lower for term in ("rash", "hives", "itching", "skin")):
            findings.append({
                "concern": "Skin reaction or inflammatory condition",
                "why": "A skin symptom was reported; recent medicines, foods, products, spread, and facial or airway swelling affect urgency.",
                "action": "Avoid a suspected new trigger and arrange medical review; seek emergency care for facial swelling or breathing difficulty.",
            })

        if not findings:
            findings.append({
                "concern": "Possible causes of the reported symptoms",
                "why": f"The assessment is based on the user's description: {entry.symptoms.strip()}. Duration, progression, severity, triggers, and associated symptoms help narrow the possibilities.",
                "action": "Monitor the pattern and arrange a clinician review if symptoms persist, worsen, or interfere with daily life; seek urgent care for severe or sudden symptoms.",
            })

        ai_explanation = cls._ask_bedrock(entry, answers, findings)
        if ai_explanation:
            findings.append({
                "concern": "AI clinical context",
                "why": ai_explanation,
                "action": "Use this as decision support and confirm the assessment with a qualified clinician.",
            })
        return findings

    @classmethod
    def _ask_bedrock(cls, entry: SymptomEntryRequest, answers: List[AnsweredQuestion], findings: List[Dict[str, str]]) -> str:
        try:
            prompt = json.dumps({
                "task": "Explain possible disease categories from symptoms without diagnosing.",
                "symptoms": entry.symptoms,
                "answers": [answer.model_dump() for answer in answers],
                "rule_findings": findings,
                "format": "One concise sentence describing the strongest symptom-to-concern link.",
            })
            response = get_bedrock_client().invoke_model(
                modelId=settings.BEDROCK_MODEL_ID,
                body=json.dumps({"prompt": prompt, "max_tokens_to_sample": 120}),
            )
            raw_body = response.get("body")
            raw = raw_body.read() if hasattr(raw_body, "read") else raw_body
            payload = raw if isinstance(raw, dict) else json.loads(raw.decode("utf-8") if isinstance(raw, bytes) else raw)
            return str(payload.get("completion") or payload.get("outputText") or "").strip()
        except Exception as exc:
            logger.warning("Bedrock disease explanation unavailable: %s", exc)
            return ""

    @classmethod
    def _log_to_timeline(
        cls,
        patient_id: str,
        assessment: RiskAssessmentResponse,
        answers: List[AnsweredQuestion],
    ):
        try:
            ddb = get_dynamodb_resource()
            table = ddb.Table(settings.DYNAMODB_TABLE_RECORDS)
            event_id = f"symp_{int(datetime.now(timezone.utc).timestamp()*1000)}"
            event_item = {
                "id": event_id,
                "patient_id": patient_id,
                "event_type": "SYMPTOM_ASSESSMENT",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "title": f"Symptom Triage: {assessment.risk_category}",
                "description": assessment.primary_symptoms,
                "severity": assessment.risk_category,
                "details": {
                    "assessment": assessment.model_dump(),
                    "answers": [answer.model_dump() for answer in answers],
                }
            }
            table.put_item(Item=event_item)
        except Exception as e:
            logger.error(f"Failed to record symptom event in timeline: {e}")

