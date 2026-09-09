# SEHATKOSH_DOCTOR_WEB_SPECIFICATION.md
# Clinical Web Portal Architecture & UI/UX Specification

---

## 1. Global Clinical Web Design System & Foundations

### 1.1 Visual Tokens & Theme Variables
Define these tokens inside `apps/doctor-web/app/globals.css` and map via `@sehatkosh/tailwind-config`.

| Token Name | Value (HSL / Hex) | Clinical Semantic Usage |
| :--- | :--- | :--- |
| `--background` | `0 0% 100%` (`#FFFFFF`) | Base workspace canvas |
| `--background-subtle` | `210 40% 98%` (`#F8FAFC`) | Sidebar fill, chart panel backing, inactive card beds |
| `--surface-card` | `0 0% 100%` (`#FFFFFF`) | Clinical panels, metric modules (1px border: `hsl(214.3 31.8% 91.4%)`) |
| `--text-primary` | `222.2 84% 4.9%` (`#020817`) | Patient names, primary vitals, diagnosis headings |
| `--text-secondary` | `215.4 16.3% 46.9%` (`#64748B`) | Timestamps, dosage schedules, ICD-10/SNOMED codes |
| `--primary` | `221.2 83.2% 53.3%` (`#2563EB`) | Interactive actions, active tab borders, focus rings |
| `--primary-hover` | `224.3 76.3% 48%` (`#1D4ED8`) | Pressed state for primary clinical actions |
| `--success` | `142.1 76.2% 36.3%` (`#16A34A`) | In-range vitals, verified prescriptions, active consent |
| `--success-subtle` | `138.5 76.5% 96.7%` (`#F0FDF4`)| Normal range metric background, active status fills |
| `--warning` | `38 92% 50%` (`#F59E0B`) | Borderline vitals, expiring consent (< 2 hours) |
| `--warning-subtle` | `48 96% 89%` (`#FEF3C7`) | Amber alert banner, pending verification badges |
| `--destructive` | `0 84.2% 60.2%` (`#EF4444`) | Severe allergies, drug contraindications, access revoked |
| `--destructive-subtle`| `0 85.7% 97.3%` (`#FEF2F2`)| Allergy banners, contraindication callouts |
| `--border` | `214.3 31.8% 91.4%` (`#E2E8F0`) | Structural dividing lines, card outlines, table borders |

### 1.2 Typography & Dense Clinical Hierarchy
Desktop viewport density requires high scannability. Font stack: `Inter` for general UI, `JetBrains Mono` for lab metrics, timestamps, and codes.

*   **Display Header:** 20pt (28px) / Bold — Patient Name in Dossier Header.
*   **Section Header (H1):** 16pt (22px) / SemiBold — Panel titles (e.g., "Longitudinal Vitals", "Active Regimen").
*   **Subsection Header (H2):** 13pt (18px) / SemiBold — SOAP group headings, modal headers.
*   **Metric Display:** 22pt (28px) / Bold / Monospace (`font-mono tracking-tight`) — Numerical vitals (e.g., `98%`, `120/80`).
*   **Body Standard:** 13pt (18px) / Regular / Leading: 20px — Doctor session notes, transcribed conversation.
*   **Table / Meta Dense:** 11pt (15px) / Medium / Leading: 16px — SNOMED/LOINC codes, dosage timing, pill tags.

### 1.3 Desktop Grid & Workspace Layout (1440px Reference Viewport)
The portal uses a 3-column responsive layout optimized for widescreen clinical review:
*   **Column 1: Collapsible App Sidebar (240px)** — Navigation, consent requests, patient roster.
*   **Column 2: Longitudinal Timeline & Clinical History (Fixed 420px or 35%)** — Chronological feed of past visits, scanned prescriptions, and lab tests.
*   **Column 3: Active Workspace & Detail Inspector (Flexible remaining width ~65%)** — Dynamic view (SOAP review, split-screen high-res document viewer, or multi-metric longitudinal chart).

---

## 2. Navigation Architecture & Global Shell

### 2.1 Persistent Sidebar (`components/Sidebar.tsx`)
Anchored to the left of all authenticated routes (`apps/doctor-web/app/(dashboard)/layout.tsx`):
+-------------------------------------------------------------+
| [SK Logo] SehatKosh MD | Dr. Tariq Khan (Cardiology)        |
+-------------------------------------------------------------+
|  [Search / Command + K]                                     |
|                                                             |
|  NAV ITEMS:                                                 |
|  * Active Patients (Roster)                                |
|  * Access Requests (Consent Engine)                         |
|  * Direct Patient Lookup (By Medical ID / QR)               |
|                                                             |
|  SESSION STATUS:                                            |
|  Connected: Shifa International Hospital                     |
|                                                             |
|  [Bottom] System Settings | Sign Out                        |
+-------------------------------------------------------------+
*   **Global Command Palette (`Command + K` / `Ctrl + K`):** Opens a fast modal input to jump directly to any patient by Medical ID (`SK-XXXX`), CNIC, or Full Name.

### 2.2 Sticky Patient Context Banner (`components/PatientBanner.tsx`)
When a clinician selects a patient, a persistent 64px header locks across the top of the main viewport:

*   **Left Section (Demographics):**
    *   Patient Name: "Muhammad Ahsan" (Bold 18px).
    *   Meta: "23 Y • Male • Blood: O+ • ID: SK-8921-X".
*   **Center Section (Critical Safety Flags):**
    *   Crimson Alert Badge: `Allergies: Penicillin (Severe), NSAIDs (Mild)` (Always visible).
    *   Chronic Tag: `Hypertension (Stage 1)`.
*   **Right Section (Consent & Security Status):**
    *   Active Access Timer: `Access Active: 23h 14m remaining` (Green clock icon).
    *   Action: "Revoke Access" / "Close Patient Dossier" button.

---

## 3. Screen-by-Screen Detailed Specifications

### 3.1 Patient Roster & Authorization Desk (`app/(dashboard)/page.tsx`)

#### Header Area
*   Title: "Clinical Roster".
*   Search Filter: Input with quick-filter pills (`All`, `Active In-Consultation`, `Awaiting Approval`, `Expired Today`).

#### Roster Table Component (`components/PatientTable.tsx`)
Dense, accessible data table built with `shadcn/ui` table primitives:

| Column Name | Type | Display Pattern |
| :--- | :--- | :--- |
| **Patient Details** | Text + Avatar | Full Name, Medical ID, Age, Gender |
| **Last Encounter** | Timestamp | Date + Reason (e.g., "Aug 30, 2026 • Bronchitis Follow-up") |
| **Active Regimen** | Badges | Pill count (`3 Active Drugs`), highlighted red if contraindicated |
| **Vitals Status** | Mini Sparkline | Last SpO2 + HR indicators (Color-coded: Green = Normal, Red = Abnormal) |
| **Access State** | Countdown Badge | `Granted (23h left)` (Green) or `Pending Approval` (Amber) |
| **Action** | Button Pair | "Open Dossier" (Primary) / "Extend Access" (Secondary Outline) |

#### Patient Quick-Lookup Modal (QR & Pin Intake)
*   For walk-in patients: Doctor can scan the QR code displayed on the patient's mobile app (Tab 5) or manually input the patient's 6-character ephemeral pairing PIN.
*   Triggers an immediate access request push notification to the patient's mobile device.

---

### 3.2 Longitudinal Patient Dossier (`app/(dashboard)/patients/[id]/page.tsx`)

A two-pane layout presenting the patient's complete history.

#### Left Pane: Timeline of Encounters (420px width)
*   **Filter Bar:** Toggle pills (`All Records`, `Doctor Visits (SOAP)`, `Prescriptions`, `Lab Reports`, `Wearable Summaries`).
*   **Timeline List (`components/TimelineFeed.tsx`):**
    *   Chronological grouping (e.g., "August 2026", "July 2026").
    *   **Encounter Card Anatomy:**
        *   Top Row: Encounter Type (`Clinical Scribe Note` vs `Scanned Prescription`) + Date.
        *   Physician Name & Clinic: "Dr. Ayesha Malik • PIMS Hospital".
        *   Summary Snippet: 2-line condensed diagnosis (e.g., "Acute bacterial pharyngitis. Prescribed Amoxicillin course; patient reported mild fever.").
        *   Drug Tag Row: Micro-pills showing prescribed molecules (`Amoxicillin 500mg`, `Paracetamol 500mg`).
        *   Selected State: Active card highlighted with a 2px blue border (`border-primary bg-sky-50/30`).

#### Right Pane: Contextual Workspace & Multi-Tab Inspector
Tabbed interface reacting to the selected timeline item:
1.  **Tab 1: Clinical SOAP Breakdown (Default)**
2.  **Tab 2: Original Document & OCR Inspector**
3.  **Tab 3: Longitudinal Vitals & Telemetry**
4.  **Tab 4: Drug-Drug & Allergy Interaction Matrix**

---

### 3.3 Tab 1: Clinical SOAP Breakdown (`components/SoapViewer.tsx`)
Displays the structured LLM transformation of the patient's consultation notes:

*   **Soap Container:** 4 distinct structured clinical panels with copy/export capabilities:
    1.  **Subjective (S):**
        *   Chief Complaints, symptom onset, reported severity, patient direct statements.
    2.  **Objective (O):**
        *   Clinical observations, blood pressure logged at consultation, synced smartwatch heart rate and SpO2 for the day of visit.
    3.  **Assessment (A):**
        *   Primary Diagnosis, Differential Diagnoses, attached ICD-10 and SNOMED-CT code pills.
    4.  **Plan (P):**
        *   *Medications Table:* Molecule name, Form, Strength, Frequency, Duration, Refill Count.
        *   *Diagnostic Orders:* Prescribed blood panels, X-rays, or ultrasounds.
        *   *Doctor Instructions:* Patient guidance notes, dietary restrictions, follow-up window.
*   **Doctor Correction Actions:**
    *   "Amend Clinical Note" button: Unlocks inline editing so the consulting physician can append or correct diagnostic codes before saving.
    *   "Export as HL7 FHIR Bundle": Generates a validated FHIR R4 `Bundle` (containing `Composition`, `Condition`, and `MedicationRequest` resources) for download or EHR sync.

---

### 3.4 Tab 2: High-Resolution Document Visualizer (`components/DocumentVisualizer.tsx`)
A split view for inspecting scanned physical documents and comparing them against extracted data:

*   **Left Viewport (50%): Deep Zoom & Pan Canvas**
    *   Renders the scanned prescription or X-ray using high-resolution canvas with pinch-to-zoom, pan, rotation (90° steps), and contrast enhancement filters.
    *   Overlay Bounding Boxes: Highlights detected text regions with subtle green outlines indicating high confidence OCR and amber outlines for low-confidence words.
*   **Right Viewport (50%): Validated Key-Value Field Review**
    *   Editable form displaying the extracted structured values:
        *   Clinician Header & Registration Number.
        *   Extracted Rx lines with SNOMED mapping status indicators.
    *   "Verify & Sign Off" Button: Marks the document as clinically reviewed and verified by a licensed doctor.

---

### 3.5 Tab 3: Longitudinal Vitals & Telemetry (`components/VitalsAnalytics.tsx`)
Visualizes data synced from the patient's wearables alongside clinic visits:

*   **Time Range Selector:** `7 Days`, `30 Days`, `90 Days`, `1 Year`.
*   **Graph 1: Resting Heart Rate vs. Daily Activity (Dual-Axis Chart)**
    *   Line chart (Resting HR) combined with bar chart (Daily Steps).
    *   Marker flags along the x-axis indicating when new prescriptions were started (to observe cardiovascular response to medications like beta-blockers or stimulants).
*   **Graph 2: Blood Oxygen (SpO2) Distribution**
    *   Scatter plot with a shaded reference band indicating the normal clinical threshold (95% - 100%).
    *   Red dot annotations for any hypoxic dips below 92%.
*   **Vitals Summary Table:**
    *   Aggregated minimum, maximum, median, and 95th percentile metrics for quick clinical review.

---

### 3.6 Tab 4: Drug-Drug & Allergy Contraindication Matrix (`components/SafetyMatrix.tsx`)
A safety module cross-referencing past medications, active prescriptions, and known patient allergies:

*   **Safety Status Alert Banner:**
    *   If no conflicts: Green banner `No pharmacological contraindications detected with active regimen`.
    *   If conflict detected: High-emphasis Crimson Banner `CRITICAL CONTRAINDICATION DETECTED`.
*   **Conflict Detail Card:**
    *   *Conflict Type:* `Drug-Allergy Cross-Reactivity`.
    *   *Molecules Involved:* `Amoxicillin` (Extracted Prescription) vs `Penicillin G` (Known Severe Allergy).
    *   *Clinical Severity:* Level 1 (Severe / Anaphylaxis Risk).
    *   *Mechanism of Action:* Beta-lactam core cross-sensitivity.
    *   *Suggested Clinical Alternative:* "Consider Macrolides (Azithromycin) or Fluoroquinolones subject to culture sensitivity."

---

### 3.7 Consent Engine & Time-Bound Access Management (`app/(dashboard)/consent/page.tsx`)

*   **Access Request Modal (`components/RequestAccessModal.tsx`):**
    *   Triggered when searching for a patient not yet in the doctor's active roster.
    *   Form Fields:
        *   Patient Medical ID / Phone Number.
        *   Requested Access Scope: Radio selection (`Full Longitudinal History`, `Prescriptions & Allergies Only`, `Emergency Vitals Only`).
        *   Requested Duration: Radio selection (`4 Hours (Single Visit)`, `24 Hours`, `7 Days`).
        *   Clinical Purpose: Text input (e.g., "Consultation for chronic hypertension").
    *   Submission: Sends an instant cryptographic authorization push to the patient's mobile app. Displays a polling indicator: "Awaiting patient approval on mobile device...".
*   **Session Expiry Lockout Overlay:**
    *   If the consent duration expires while the physician has the patient dossier open:
    *   Instantly blur the clinical data behind a frosted glass overlay (`backdrop-blur-md`).
    *   Display a centered modal: "Consent Window Expired. Patient authorization has concluded. Request extension to re-enable view."

---

## 4. Defensive UX, Security & Clinical Guardrails

### 4.1 Accidental Action Prevention & Auditing
*   **Prescription Override Safeguard:** If a doctor marks a contraindicated medication as "Clinically Overridden", display a mandatory justification modal requiring the doctor to type a clinical rationale before saving.
*   **Full Audit Logging:** Every document view, image zoom, SOAP edit, and FHIR export automatically dispatches an audit event (`doctorId`, `patientId`, `actionType`, `timestamp`) to ensure HIPAA / GDPR compliance.

### 4.2 Network Resilience & Fast State Hydration
*   **TanStack Query Cache Layer:** Patient dossiers cache for 5 minutes of inactive browsing. When switching between timeline items, data renders instantly from cache while revalidating in the background.
*   **Copy to Clipboard Tooling:** Every medication name, dosage string, and ICD-10 code features a 1-click copy button with visual checkmark feedback for quick pasting into local hospital EHR systems.

---

## 5. Directory Structure & File Manifest for `apps/doctor-web`

```text
apps/doctor-web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                # Clinician authentication & 2FA entry
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Global clinical shell (Sidebar + Header)
│   │   ├── page.tsx                    # Clinical roster & active patient desk
│   │   ├── consent/
│   │   │   └── page.tsx                # Consent requests & authorization hub
│   │   └── patients/
│   │       └── [id]/
│   │           ├── page.tsx            # Longitudinal Patient Dossier (Timeline + Inspector)
│   │           └── loading.tsx         # Skeleton loader for patient charts
│   ├── globals.css                     # Tailwind tokens matching @sehatkosh/tailwind-config
│   └── layout.tsx                      # Root HTML shell & Inter font provider
├── components/
│   ├── ui/                             # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── tabs.tsx
│   ├── CommandPalette.tsx              # Command + K instant patient lookup
│   ├── ConsentCountdown.tsx            # Real-time access timer badge
│   ├── DocumentVisualizer.tsx          # Pinch-pan-zoom high-res prescription canvas
│   ├── PatientBanner.tsx               # Sticky top patient demographics & allergy header
│   ├── PatientTable.tsx                # Searchable roster table
│   ├── RequestAccessModal.tsx          # Push consent request trigger
│   ├── SafetyMatrix.tsx                # Drug-drug and allergy interaction warning panel
│   ├── Sidebar.tsx                     # Collapsible persistent navigation
│   ├── SoapViewer.tsx                  # Structured SOAP note display & editor
│   ├── TimelineFeed.tsx                # Chronological card list of encounters
│   └── VitalsAnalytics.tsx             # Dual-axis charts for HR, steps, and SpO2
├── hooks/
│   ├── usePatient.ts                   # TanStack Query hook fetching patient dossier
│   ├── usePatientVitals.ts             # Hook for longitudinal telemetry data
│   └── useConsentSession.ts            # Hook monitoring active session expiration
├── lib/
│   ├── fhirExporter.ts                 # Utility converting dossier state to FHIR R4 Bundle
│   └── utils.ts                        # clsx and twMerge helper
└── next.config.mjs                     # Transpile packages configuration

