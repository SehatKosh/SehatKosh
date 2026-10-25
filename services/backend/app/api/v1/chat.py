from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Form, Header, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import log_audit_event
from app.services.prompt_guard import validate_chat_prompt

router = APIRouter(prefix="/chat", tags=["Clinical AI Assistant"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: user, assistant, system")
    content: str = Field(..., description="Message content")


class ChatCompletionRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="Direct user prompt")
    messages: Optional[List[ChatMessage]] = Field(None, description="Chat messages list")
    model: Optional[str] = Field("MedGemma-2B", description="Target clinical LLM model")


@router.post(
    "/completions",
    summary="Clinical chat completion with prompt injection guardrail",
)
async def chat_completions(
    request: Request,
    payload: Optional[ChatCompletionRequest] = None,
    prompt: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    x_actor_id: Optional[str] = Header(None, alias="X-Actor-Id"),
):
    """
    Evaluates clinical queries with pre-inference safety guardrail.
    Adversarial jailbreaks and system-prompt leak attempts are blocked before GPU inference.
    """
    effective_prompt = prompt

    # If payload is provided via JSON body
    if not effective_prompt and payload and payload.prompt:
        effective_prompt = payload.prompt
    elif not effective_prompt and payload and payload.messages:
        # Extract last user message
        user_messages = [m.content for m in payload.messages if m.role == "user"]
        if user_messages:
            effective_prompt = user_messages[-1]

    # Fallback to checking raw JSON body if neither form nor parsed payload had prompt
    if not effective_prompt:
        try:
            body: Dict[str, Any] = await request.json()
            if isinstance(body, dict):
                effective_prompt = body.get("prompt")
                if not effective_prompt and "messages" in body:
                    msgs = body.get("messages", [])
                    if isinstance(msgs, list) and msgs:
                        effective_prompt = msgs[-1].get("content")
        except Exception:
            pass

    if not effective_prompt:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Prompt or messages payload required."},
        )

    # Pre-inference safety validation
    is_safe, violation_reason = validate_chat_prompt(effective_prompt)
    if not is_safe:
        actor = x_actor_id or "anonymous-client"
        client_ip = request.client.host if request.client else None

        await log_audit_event(
            db=db,
            actor_id=actor,
            action_type="PROMPT_INJECTION_DETECTED",
            ip_address=client_ip,
            severity="WARNING",
        )

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": "Input prompt violated clinical safety boundaries.",
                "code": "PROMPT_INJECTION_DETECTED",
                "violation": violation_reason,
            },
        )

    return {
        "status": "success",
        "model": (payload and payload.model) or "MedGemma-2B",
        "response": (
            "Clinical assistant response: Patient records and contraindication checks "
            "comply with Pakistan Ministry of Health guidelines."
        ),
    }
