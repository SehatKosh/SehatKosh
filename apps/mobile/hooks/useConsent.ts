import { useState } from "react";

export function useConsent() { const [pending, setPending] = useState(true); return { pending, approve: () => setPending(false), reject: () => setPending(false) }; }
