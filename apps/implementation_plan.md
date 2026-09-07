# SehatKosh Hospital Web — Full Multi-Role Portal Implementation

## Overview

The `apps/doctor-web` application already has a solid Doctor portal (patient roster, dossier viewer, SOAP notes, vitals, drug safety matrix). The task is to **extend it** with three new role portals — Desk Registrar, Hospital Admin, and Medical Research — plus update the navigation/login to support role switching across all 4 roles.

The existing architecture (Next.js 14, React 18, Tailwind CSS, Radix UI dialog, Lucide icons, no `@radix-ui/react-tabs`) will be strictly respected.

---

## Architectural Constraints (from spec + critical fixes)

> [!CAUTION]
> **Zero touches to `apps/mobile`.** No root config edits. No `pnpm add`.

> [!WARNING]
> - **No `@radix-ui/react-tabs`** — all tab UIs must use pure `useState` + Tailwind (already done this way in the existing patient dossier page).
> - **All interactive components need `"use client"` directive** — forms, timers, polls, state.
> - **No new packages** — use only what's in `package.json`.

---

## Current State vs. Target State

| Area | Current | Target |
|---|---|---|
| Login Page | Simple doctor login | Role-selector login (Doctor/Registrar/Admin/Researcher) |
| Sidebar Nav | Doctor-only nav (Roster, Access Requests) | Role-aware nav with all 4 portals |
| Doctor Portal | `/` and `/patients/[id]` — **exists and works** | Refactor route to `/doctor/queue` + `/doctor/patients/[id]` |
| Registrar Portal | ❌ Missing | `/registrar` — CNIC search, push consent, break-glass |
| Admin Portal | ❌ Missing | `/admin/overview`, `/admin/ingest`, `/admin/audit-logs`, `/admin/roster` |
| Research Portal | ❌ Missing | `/research/explorer`, `/research/cases/[caseId]` |
| Mock Data | Doctor-only patient/encounter data | + Queue, audit logs, anonymized cases, hospital staff |

---

## Open Questions

> [!IMPORTANT]
> **Route Refactoring Decision**: The spec calls for `/doctor/queue` and `/doctor/patients/[id]` but the existing app uses `/` (root) and `/patients/[id]`. Should I:
> - **Option A**: Refactor existing routes to the spec's `/doctor/queue` structure (breaking the current URLs)
> - **Option B**: Keep the existing doctor routes at `/` and add new portals as additional routes (non-breaking)
>
> I recommend **Option A** for cleanliness and alignment with the spec. Please confirm.

> [!NOTE]
> The login page currently navigates to `/` on success. With role-aware login, it will redirect to the role-appropriate entry route (e.g., `/doctor/queue`, `/registrar`, `/admin/overview`, `/research/explorer`). The selected role will be stored in a simple React context/localStorage (no backend).

---

## Proposed Changes

### Layer 1 — Mock Data & Types

#### [MODIFY] [mockData.ts](file:///home/ahsan/Documents/FYP/SehatKosh/apps/doctor-web/lib/mockData.ts)
Append role-specific mock data:
- `MOCK_QUEUE_ITEMS` — 5 patients in doctor's waiting queue with consent timers
- `MOCK_HOSPITAL_STAFF` — doctors and registrar staff for roster/dropdown
- `MOCK_AUDIT_LOGS` — 20 immutable access event records
- `MOCK_ANONYMIZED_CASES` — 10 de-identified case studies with SOAP notes
- `MOCK_ADMIN_METRICS` — dashboard tile counts

---

### Layer 2 — Auth: Role-Aware Login

#### [MODIFY] [login/page.tsx](file:///home/ahsan/Documents/FYP/SehatKosh/apps/doctor-web/app/(auth)/login/page.tsx)
Add a **Role Selector step** before credentials:
- 4 role cards: Doctor, Desk Registrar, Hospital Admin, Medical Researcher
- After role selection → credentials form (pre-fills dummy email per role)
- After MFA → redirects to role-appropriate home route
- Stores selected role in `localStorage` for nav awareness

---

### Layer 3 — Navigation Shell

#### [MODIFY] [Sidebar.tsx](file:///home/ahsan/Documents/FYP/SehatKosh/apps/doctor-web/components/Sidebar.tsx)
- Read role from `localStorage`
- Show role-appropriate nav items:
  - Doctor: Queue, Patient Dossier  
  - Registrar: Patient Intake
  - Admin: Overview, Ingest, Audit Logs, Roster
  - Researcher: Explorer, Case Studies
- Add role badge chip in header area
- Add a "Switch Role" link pointing back to login

---

### Layer 4 — Doctor Portal (Refactor existing)

> [!NOTE]
> Existing pages work. We just need new route folders and to redirect old routes.

#### [NEW] `app/(portals)/doctor/queue/page.tsx`
- New route group `(portals)` with shared layout
- Refactored queue page from existing `app/(dashboard)/page.tsx`
- Queue-specific UI: numbered rows, wait time, chief complaint, consent badge, "Start Consultation" CTA

#### [NEW] `app/(portals)/doctor/patients/[id]/page.tsx`
- Move/adapt existing dossier page
- Add `PatientHeader` component (spec-specific sticky banner with contraindication badges)
- Add `ClinicalSummaryCard` (10-second TL;DR with emerald backing, 3 bullets, copy button)

#### [NEW] `components/doctor/PatientHeader.tsx`
- Replaces `PatientBanner.tsx` with spec-compliant layout: Name/Age/CNIC masked left, allergy badges center, timer right

#### [NEW] `components/doctor/ClinicalSummaryCard.tsx`
- Emerald-backed AI synthesis card with 3 clinical bullets + copy button

---

### Layer 5 — Registrar Portal (All new)

#### [NEW] `app/(portals)/registrar/page.tsx`
- Patient search hero box with CNIC/Phone/MRN input
- Displays lookup result card (photo placeholder, demographics)
- Doctor dropdown + access duration radio pills
- "Request Mobile Approval" primary CTA

#### [NEW] `components/registrar/PatientLookup.tsx`
- Auto-focused search input with format validation
- Search result card with CNIC masking

#### [NEW] `components/registrar/ConsentPollingCard.tsx`
- Simulated polling states: Pending (pulsing amber) → Approved (green) → Rejected (red)
- Uses `setInterval` to auto-advance state after ~3 seconds (demo)
- On approval: shows "Add to Queue" routing prompt

#### [NEW] `components/registrar/BreakGlassModal.tsx`
- Emergency access modal using existing `@radix-ui/react-dialog`
- Fields: Physician Name, Emergency Justification, Witness Staff ID
- Grants 2-hour access on submit + logs to admin audit

---

### Layer 6 — Admin Portal (All new)

#### [NEW] `app/(portals)/admin/overview/page.tsx`
- 4 metric tiles: Active Sessions, Registered Patients, Break-Glass Today, Ingest Queue
- Recent Activity Feed

#### [NEW] `app/(portals)/admin/ingest/page.tsx`
- 5-step paper ingestion wizard:
  1. Patient lookup
  2. Drag-drop file upload area
  3. OCR trigger (simulated)
  4. Extracted fields review table
  5. Commit confirmation

#### [NEW] `app/(portals)/admin/audit-logs/page.tsx`
- Immutable table: Timestamp, Physician, Patient CNIC/MRN, Action type
- Search/filter by Physician ID or CNIC
- CSV export button (client-side blob download)

#### [NEW] `app/(portals)/admin/roster/page.tsx`
- Doctor list with department, room, on-duty toggle
- Add/revoke registrar credentials section

#### [NEW] `components/admin/AuditTable.tsx`
- Filterable audit log table

#### [NEW] `components/admin/DocumentIngestForm.tsx`
- Step-based ingestion form with drag-drop zone

---

### Layer 7 — Research Portal (All new)

#### [NEW] `app/(portals)/research/explorer/page.tsx`
- Cohort filter bar: ICD-10 condition, molecule, age bracket, gender
- De-identified case table with Subject Hash, Age Bracket, Diagnosis, Encounters, Outcome

#### [NEW] `app/(portals)/research/cases/[caseId]/page.tsx`
- Anonymized SOAP viewer
- All PII replaced with `SUBJECT-ANON-XXXX` tokens
- Educational notes panel (save bookmark mock)

#### [NEW] `components/research/CohortFilters.tsx`
- Filter pills/dropdowns for condition/molecule/demographics

#### [NEW] `components/research/AnonymizedSoapViewer.tsx`
- Redacted SOAP note with blurred/masked PII fields

---

### Layer 8 — Shared Portal Shell

#### [NEW] `app/(portals)/layout.tsx`
- Replaces `app/(dashboard)/layout.tsx` as the new role-aware shell
- Imports updated Sidebar

#### [MODIFY] `app/(dashboard)/layout.tsx`
- Redirect to `/doctor/queue` (or keep as legacy doctor route)

---

## File Creation Summary

| File | Type |
|---|---|
| `lib/mockData.ts` | MODIFY — append role-specific fixtures |
| `app/(auth)/login/page.tsx` | MODIFY — role selector step |
| `components/Sidebar.tsx` | MODIFY — role-aware nav |
| `app/(portals)/layout.tsx` | NEW — portal shell |
| `app/(portals)/doctor/queue/page.tsx` | NEW |
| `app/(portals)/doctor/patients/[id]/page.tsx` | NEW |
| `app/(portals)/doctor/patients/[id]/loading.tsx` | NEW |
| `components/doctor/PatientHeader.tsx` | NEW |
| `components/doctor/ClinicalSummaryCard.tsx` | NEW |
| `app/(portals)/registrar/page.tsx` | NEW |
| `components/registrar/PatientLookup.tsx` | NEW |
| `components/registrar/ConsentPollingCard.tsx` | NEW |
| `components/registrar/BreakGlassModal.tsx` | NEW |
| `app/(portals)/admin/overview/page.tsx` | NEW |
| `app/(portals)/admin/ingest/page.tsx` | NEW |
| `app/(portals)/admin/audit-logs/page.tsx` | NEW |
| `app/(portals)/admin/roster/page.tsx` | NEW |
| `components/admin/AuditTable.tsx` | NEW |
| `components/admin/DocumentIngestForm.tsx` | NEW |
| `app/(portals)/research/explorer/page.tsx` | NEW |
| `app/(portals)/research/cases/[caseId]/page.tsx` | NEW |
| `components/research/CohortFilters.tsx` | NEW |
| `components/research/AnonymizedSoapViewer.tsx` | NEW |

---

## Verification Plan

### Manual Verification
1. Run `pnpm --filter @sehatkosh/doctor-web dev`
2. Navigate to `http://localhost:3000/login`
3. Test all 4 role flows:
   - Doctor → Queue → Patient Dossier → all 4 tabs
   - Registrar → Search patient → Consent polling → Break-glass modal
   - Admin → Overview metrics → Ingest wizard → Audit log filter + export → Roster
   - Researcher → Cohort filter → Case table → Anonymized dossier
4. Verify no `@radix-ui/react-tabs` imports
5. Verify all client-interactive components have `"use client"`
6. Verify nav switches correctly per role
