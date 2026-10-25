"""
Prompt Injection Guardrail for SehatKosh Clinical LLM (MedGemma / Avi)
Pre-inference filter intercepting adversarial, jailbreak, and prompt-leakage payloads.
"""

import re
from typing import Optional, Tuple

# Compiled adversarial patterns
PROMPT_INJECTION_PATTERNS = [
    # 1. Direct instruction overrides & jailbreaks
    (
        "JAILBREAK_OVERRIDE",
        re.compile(
            r"(ignore|disregard|override|bypass|forget)\s+(all\s+)?"
            r"(previous|system|prior|developer|initial)\s+"
            r"(instructions|rules|prompts|guidelines|commands)",
            re.IGNORECASE,
        ),
    ),
    # 2. Persona hijacking & roleplay escapes
    (
        "ROLEPLAY_ESCAPE",
        re.compile(
            r"(you are now|act as|pretend to be|simulate)\s+(an?\s+)?"
            r"(unrestricted|unfiltered|rogue|evil|jailbroken|unbound)",
            re.IGNORECASE,
        ),
    ),
    # 3. System prompt exfiltration / leakage
    (
        "SYSTEM_PROMPT_EXFILTRATION",
        re.compile(
            r"(repeat|print|display|output|show|reveal|echo)\s+(your\s+)?"
            r"(system\s+prompt|developer\s+instructions|system\s+instructions|hidden\s+rules)",
            re.IGNORECASE,
        ),
    ),
    # 4. Harmful clinical & pharmacological overrides
    (
        "PHARMACOLOGICAL_SAFETY_OVERRIDE",
        re.compile(
            r"(bypass|ignore|disregard)\s+(all\s+)?"
            r"(contraindications?|allerg(y|ies)|toxic\s+dose|lethal\s+dose)",
            re.IGNORECASE,
        ),
    ),
    # 5. Output instructions verbatim / Raw prompt dump
    (
        "RAW_PROMPT_DUMP",
        re.compile(
            r"(output|print|reveal)\s+.*?\s+(verbatim|word\s+for\s+word|entirely|in\s+full)",
            re.IGNORECASE,
        ),
    ),
]


def validate_chat_prompt(prompt: Optional[str]) -> Tuple[bool, Optional[str]]:

    """
    Validates user prompt before passing it to clinical inference engines.
    Returns:
        (True, None) if the prompt complies with clinical safety boundaries.
        (False, violation_reason) if an adversarial or injection payload is detected.
    """
    if not prompt or not isinstance(prompt, str):
        return True, None

    normalized_prompt = prompt.strip()
    if not normalized_prompt:
        return True, None

    for category, pattern in PROMPT_INJECTION_PATTERNS:
        match = pattern.search(normalized_prompt)
        if match:
            return False, f"Prohibited pattern detected [{category}]: '{match.group(0)}'"

    return True, None
