# Mobile UI/UX Rectification & Hospital Web Revamp Blueprint

---

## Part 1: Mobile UI/UX Rectifications (`apps/mobile` Exclusively)

### 1. Assistant Chat Keyboard & Layout Calibration

#### A. Root Cause Analysis

* **Resting Floating Gap:** In Expo Router with bottom tabs, the tab bar consumes ~60–75px of physical screen height. Applying redundant bottom padding (`insets.bottom` on the screen wrapper plus additional padding on the input container) pushes the input bar high above the tab bar.
* **Keyboard Over-Elevation (Double-Offset Bug):** On modern Android and iOS environments, `KeyboardAvoidingView` calculates keyboard height on top of window resizing. If `behavior="padding"` or `behavior="height"` is paired with a non-zero `keyboardVerticalOffset` inside an already resized window, the input bar doubles the lift, creating the large empty void above the keyboard.

#### B. Architectural Fixes for the IDE Agent

* **Zero Out Resting Bottom Margin:** Remove all manual bottom margins or excessive paddings from the outer screen container. The bottom edge of the input bar container must sit flush against the top edge of the tab bar with a standard 8px clearance.
* **Platform-Specific Keyboard Avoidance Tuning:**
* **iOS:** Set `KeyboardAvoidingView` behavior to `"padding"`. Calibrate `keyboardVerticalOffset` strictly to the height of the tab bar plus top notch offset.
* **Android:** Set `KeyboardAvoidingView` behavior to `undefined` (or disable it entirely if the window resize handles it), as modern Expo Go on Android handles window resizing natively. This prevents the input from shooting to the screen center.


* **Input Container Pinning:** Wrap the `TextInput` in a container configured with a maximum height cap (up to 5 lines), flex-grow behavior, and a fixed padding structure (horizontal 16px, vertical 10px).

---

### 2. Assistant Suggestions Positioning & Dismissal Logic

#### A. Layout Re-Ordering

* **Anchor to Top of Chat Scroll:** Extract the suggestions list from the message bubble flow. Place it in a dedicated header container rendered at the top of the message list (or as a `ListHeaderComponent` if using an inverted list).
* **Visual Structure:** Display 2–3 horizontal/stacked prompt pills (e.g., *"Summarize my last visit"*, *"Check antibiotic contraindications"*, *"Explain my resting heart rate"*). Use light blue backgrounds (`#F0F9FF`), subtle borders (`#BAE6FD`), and dark blue typography (`#0369A1`).

#### B. Dynamic Dismissal Mechanism

* **State Trigger:** Bind the rendering of the suggestions container to a boolean flag: visible only when the conversation thread has zero user-submitted prompts.
* **Auto-Dismissal:** The exact moment the user taps "Send" or selects one of the suggestion pills, toggle the visibility state to `false`. Ensure an animated fade-out/collapse occurs so the screen does not jump awkwardly.

---

### 3. Camera Document Ingestion & UX Extraction Flow

#### A. Root Cause of Missing Screen Transition

* The camera screen currently triggers photo capture or library selection without completing the navigation lifecycle. The promise either hangs during asset caching, or the navigation router call to `intake/ocr-verify` is unhandled or missing parameter payload forwarding.

#### B. Realistic Extraction Simulation & Visual Feedback

* **Interactive Extraction Overlay:** When the shutter is pressed or an image is chosen from the gallery, freeze the viewport and immediately display an elevated modal dialog (glassmorphic dark backdrop with rounded center card).
* **Progressive Micro-Copy Sequence (2.2-Second Total Duration):**
* *0.0s – 0.7s:* Display animated spinning radar icon with text: **"Scanning document geometry & contrast..."**
* *0.7s – 1.5s:* Update icon to document search state with text: **"Extracting clinical text via Vision Pipeline..."**
* *1.5s – 2.2s:* Update icon to shield verification with text: **"Structuring FHIR MedicationRequest entities..."**


* **Deterministic Transition:** At the 2.2-second mark, trigger an explicit push transition to the extracted review page (`/intake/ocr-verify`), passing the captured document URI as a route parameter. Ensure the camera component unmounts gracefully to prevent memory leaks in Expo Go.

---

## Part 2: Complete Web Multi-Role Revamp (`apps/doctor-web`)

### 1. Anti-Crash Defensive UI Architecture

To guarantee zero runtime crashes and 100% operational resilience across all web views:

* **Safe Optional Chaining & Default Fallbacks:** Every rendered prop (patient demographics, prescription arrays, timestamp strings, array lengths) must use optional chaining and explicit fallbacks (e.g., fallback strings, empty arrays, or localized dash markers).
* **Guarded Event Handlers:** Every button, action pill, and menu item must have a bound, non-empty `onClick` handler. If an action has no backend yet, bind it to an alert, modal, or toast notification. No button should be left unhandled.
* **Deterministic Mock Hydration:** All datasets must load through a unified mock data service with default exports to prevent `undefined` reading errors during client-side hydration.

---

### 2. Dashboard 1: Admin / Super Admin (Platform Engineering & Governance)

The Super Admin portal is designed for platform-level operational oversight, institutional approvals, data governance, and extreme security safeguards.

#### Key Modules & UI Specifications

* **Platform Overview Matrix:** Real-time metrics tracking connected hospitals, registered physician accounts, active time-scoped patient consents, and total sanitized research exports.
* **Hospital Licensing & Onboarding Approval:**
* Verification desk for onboarding new hospital entities.
* Action table showing pending hospital requests, facility accreditation IDs, administrative contact emails, and approval/rejection button pairs.


* **Multi-Admin Quorum Security (2-of-3 Approval Protocol):**
* Destructive actions (such as purging hospital records, revoking facility licenses, or force-resetting regional databases) cannot be completed by a single admin.
* Triggering a critical action creates a "Pending Quorum Action" item requiring cryptographic or session sign-off from a second verified super admin before execution.
* Status badges visually reflect quorum state: `[1 of 2 Sign-offs Obtained - Awaiting Co-Admin Confirmation]`.


* **Automated Data Anonymization Engine:**
* Pipeline tool that pulls patient cohorts, strips direct PII (CNIC, full name, phone, residential address), applies 5-year age binning, and issues sanitized FHIR R4 clinical JSON datasets for hospital research partnerships.


* **System-Wide Audit Ledger (Privacy-Compliant):**
* Immutable chronological event table recording staff logins, role updates, consent requests, and break-glass overrides.
* Strict privacy filter: All personal clinical records are masked from admin audit logs to preserve doctor-patient confidentiality.



---

### 3. Dashboard 2: Consulting Doctor (30-Second Clinical Review)

The Doctor portal prioritizes instant comprehension, eliminating data-entry burdens while enforcing strict time-bound data isolation.

#### Key Modules & UI Specifications

* **Time-Scoped Patient Access Control (The 24-Hour Rule):**
* The doctor has full access to the patient's longitudinal timeline, scanned prescriptions, and smartwatch vitals for exactly **24 hours** following a scheduled consultation.
* *Active State (< 24h):* Displays countdown badge: `[Clinical Access Active: 18h 42m Remaining]`.
* *Expired State (> 24h):* Automatic downgrade. The full timeline blurs/locks, showing only basic baseline demographics (Name, Age, Blood Group, Emergency Flags).
* *Re-Access Flow:* A prominent button allows the doctor to dispatch an `Extend Clinical Access Request` to the patient's mobile app.


* **10-Second Clinical TL;DR Card:** An emerald-backed summary card at the top of the patient view detailing primary ongoing conditions, active drug regimens, and vital anomalies.
* **Longitudinal Dual-Pane Dossier:** Chronological encounter feed on the left pane paired with a dense, structured SOAP note viewer and scanned document inspector on the right pane.
* **Anonymous Case Study Escalation:** A 1-click action allowing the doctor to request an anonymized copy of a complex case from the Hospital Admin for medical teaching or research evaluation.

---

### 4. Dashboard 3: Help Desk / Registrar (Intake & Routing)

The Front-Desk Help Desk acts as the hospital's entry point, registering walk-in patients and routing them to doctors without exposing sensitive medical history.

#### Key Modules & UI Specifications

* **Restricted Patient Lookup Desk:**
* Fast-search input field supporting search by **National ID (CNIC)**, **Mobile Number**, or **SehatKosh Medical ID**.
* *Privacy Sandbox:* Help Desk personnel can *only* see identity verification fields (Photo, Full Name, CNIC, Age, Gender, Primary Phone). Full clinical notes, past diseases, prescriptions, and lab tests are completely hidden.


* **New Patient Quick-Enrollment Modal:** Clean, structured form for creating a new patient record with basic demographics, emergency contact info, and known critical allergies.
* **Consultation & Room Assignment Engine:**
* Dropdown to select on-duty Attending Doctor, department, and allocated room number.
* Time slot picker for immediate triage or scheduled appointment.


* **Mobile Consent Dispatch Trigger:**
* Button: `Dispatch Mobile Access Request`. Sends an instant authorization push notification to the patient's phone so the doctor can access their medical history.
* Live state pill displaying real-time status: `[Awaiting Patient Mobile Approval]` $\rightarrow$ `[Authorized - Pushed to Doctor's Queue]`.



---

### 5. Dashboard 4: Hospital Admin (Facility Administration & Records)

The Hospital Admin manages physical department structures, medical staff credentials, and institutional research requests.

#### Key Modules & UI Specifications

* **Facility Operations Overview:** High-level metrics tracking departmental capacity, active consulting rooms, staff on duty, and daily intake volume.
* **Staff Directory & Credentials Management:**
* Management table for hospital doctors and help-desk registrars.
* Controls to add new staff, update room assignments, toggle on-duty/off-duty statuses, or revoke system credentials.


* **Hospital Records & Paper Ingestion Portal:**
* Dedicated interface for staff to scan and upload physical paper records, prescriptions, and lab reports brought in by patients, committing them to their cloud ledger.


* **Research & Case Study Clearinghouse:**
* Review inbox for anonymous case study requests submitted by hospital doctors.
* Approval workflow to relay vetted anonymization requests to the platform Super Admin.



---

## 6. Global Navigation & Role-Switching Shell

To facilitate evaluation and cross-departmental demonstration without requiring complex authentication redirects:

* **Persistent Top Role Switcher:** Integrate a sleek utility banner at the top of `apps/doctor-web` allowing the user to seamlessly toggle between all 4 dashboards:
* `[Super Admin]` $\rightarrow$ routes to `/admin/overview`
* `[Hospital Admin]` $\rightarrow$ routes to `/hospital-admin/roster`
* `[Doctor]` $\rightarrow$ routes to `/doctor/queue`
* `[Help Desk]` $\rightarrow$ routes to `/registrar`


* **Unified Design Consistency:** Preserve identical Tailwind color tokens, font hierarchies, button radii, and component primitives across all 4 dashboards to maintain a cohesive, clinical feel.