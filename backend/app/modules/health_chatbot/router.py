from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.modules.health_chatbot.schemas import HealthChatRequest, HealthChatResponse
from app.modules.health_chatbot.service import HealthChatbotService

router = APIRouter(prefix="/health-chat", tags=["Health Chatbot"])


@router.post("/message", response_model=HealthChatResponse)
async def send_health_chat_message(
    payload: HealthChatRequest,
    current_user: dict = Depends(get_current_user),
):
    return HealthChatbotService.answer(payload)
