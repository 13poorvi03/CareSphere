import json
import logging
from typing import Any, Dict

from app.config import settings
from app.core.aws_clients import get_bedrock_client
from app.modules.health_chatbot.schemas import HealthChatRequest, HealthChatResponse

logger = logging.getLogger(__name__)


class HealthChatbotService:
    @staticmethod
    def _fallback_reply(message: str) -> str:
        text = message.lower()
        if "fever" in text or "temperature" in text:
            return "For a fever, rest, drink fluids, and check your temperature periodically. Seek urgent care for trouble breathing, confusion, a stiff neck, dehydration, or a very high or persistent fever."
        if "diabetes" in text or "blood sugar" in text:
            return "Track your glucose as advised, take prescribed medicines consistently, choose balanced meals, and stay active safely. Contact your clinician for repeated high readings or symptoms such as vomiting, confusion, or severe weakness."
        if "blood pressure" in text or "hypertension" in text:
            return "For healthy blood pressure, take prescribed medicines consistently, limit excess salt, stay active as appropriate, sleep regularly, and keep a home reading log. Seek urgent care for chest pain, severe breathlessness, weakness on one side, or sudden vision changes."
        if "headache" in text or "migraine" in text:
            return "Rest in a quiet, comfortable place, drink water, and note possible triggers such as missed meals, poor sleep, or bright light. Seek urgent care for sudden explosive pain, new weakness, confusion, fever with a stiff neck, or vision loss."
        if "exercise" in text or "lifestyle" in text or "healthy" in text or "diet" in text:
            return "Start with regular gentle activity that you can do safely, eat a varied diet with vegetables and protein, drink water, sleep consistently, and avoid tobacco. Build changes gradually and ask your clinician about limits if you have a medical condition."
        if "what is" in text or "meaning" in text or "explain" in text or "simpl" in text:
            return "I can explain medical terms in plain language. Please share the exact term or sentence, and I will describe what it usually means, why it may matter, and what to ask your clinician."
        if "pain" in text or "symptom" in text or "feel" in text:
            return "Please note where the symptom is, when it began, how severe it is, and what makes it better or worse. Seek urgent care for chest pain, severe breathing difficulty, confusion, fainting, or sudden weakness."
        return "I can help with general health questions, lifestyle ideas, symptom guidance, and plain-language explanations. Share your question or the medical term you want explained."

    @classmethod
    def answer(cls, request: HealthChatRequest) -> HealthChatResponse:
        fallback = cls._fallback_reply(request.message)
        try:
            prompt = json.dumps({
                "task": "Answer the user's health or general question in simple language. Support symptom guidance, lifestyle tips, general health Q&A, and medical-term simplification. Do not diagnose, prescribe, or replace a clinician. Mention urgent red flags when relevant.",
                "patient_message": request.message,
                "conversation": request.conversation[-6:],
                "response_style": "Warm, practical, under 120 words, with short paragraphs.",
            })
            response = get_bedrock_client().invoke_model(
                modelId=settings.BEDROCK_MODEL_ID,
                body=json.dumps({"prompt": prompt, "max_tokens_to_sample": 220}),
            )
            raw_body = response.get("body")
            raw = raw_body.read() if hasattr(raw_body, "read") else raw_body
            payload: Dict[str, Any] = raw if isinstance(raw, dict) else json.loads(raw.decode("utf-8") if isinstance(raw, bytes) else raw)
            reply = str(payload.get("completion") or payload.get("outputText") or "").strip()
            if reply and "simulated bedrock response" not in reply.lower():
                fallback = reply
        except Exception as exc:
            logger.warning("Bedrock health chatbot unavailable: %s", exc)

        return HealthChatResponse(
            reply=fallback,
            disclaimer="General information only. For diagnosis or treatment, speak with a qualified healthcare professional.",
            suggested_prompts=["What should I do for a high fever?", "How can I manage diabetes safely?", "Explain this medical term simply"],
        )
