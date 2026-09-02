import { useState } from "react";

export function useVitals() { const [vitals] = useState({ heartRate: 72, oxygen: 98, steps: 6420, sleep: "7h 24m", syncedAt: "2m ago" }); return vitals; }
