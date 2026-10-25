"""
Security Middleware for SehatKosh FastAPI Backend
- Injects OWASP recommended security headers on all outgoing HTTP responses.
- Implements IP-based sliding-window rate limiting on sensitive healthcare routes.
"""

import time
from collections import defaultdict
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware enforcing OWASP security headers and defensive rate limiting
    across sensitive clinical data access points.
    """

    rate_limit_rpm: int = 120
    window_seconds: int = 60
    request_history: Dict[str, List[float]] = defaultdict(list)
    sensitive_prefixes = (
        "/api/v1/patients/search",
        "/api/v1/consent/break-glass",
        "/api/v1/prescriptions/extract",
    )

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Apply sliding-window rate limiting on sensitive routes
        if any(path.startswith(prefix) for prefix in self.sensitive_prefixes):
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            elif request.client:
                client_ip = request.client.host
            else:
                client_ip = "unknown_client"

            now = time.time()
            cutoff = now - self.window_seconds

            # Filter timestamps to current sliding window
            self.request_history[client_ip] = [
                ts for ts in self.request_history[client_ip] if ts > cutoff
            ]

            effective_limit = getattr(self, "rate_limit_rpm", 120)
            if len(self.request_history[client_ip]) >= effective_limit:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded. Too many requests on sensitive clinical endpoint.",
                        "code": "RATE_LIMIT_EXCEEDED",
                    },
                    headers={"Retry-After": "60"},
                )

            self.request_history[client_ip].append(now)

        response: Response = await call_next(request)

        # Inject OWASP recommended defensive security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; frame-ancestors 'none'; object-src 'none';"
        )

        return response
