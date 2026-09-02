# SEHATKOSH_UI_UX_SPECIFICATION.md
# Architecture & Design Specification for Frontend Engineering

---

## 1. Global Design System & Foundations

### 1.1 Color Tokens & Semantic Roles
Define these tokens inside `packages/tailwind-config/tailwind.config.js` and `apps/mobile/global.css`.

| Token Name | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `background` | `#FFFFFF` | Primary screen canvas and elevated modal backgrounds |
| `background-subtle` | `#F8FAFC` | Screen section fills, grouped list backings, inactive pills |
| `surface-card` | `#FFFFFF` | Card containers; styled with 1px border (`#E2E8F0`) |
| `text-primary` | `#0F172A` | Page titles, primary metric numbers, high-emphasis text |
| `text-secondary` | `#475569` | Field labels, timestamps, body summaries |
| `text-muted` | `#94A3B8` | Placeholders, inactive tab icons, disabled states |
| `primary` | `#0284C7` | Primary buttons, active tab indicators, selected radio borders |
| `primary-hover` | `#0369A1` | Active press state for primary interactive elements |
| `success` | `#10B981` | Normal vitals, verified sync status, completion checkmarks |
| `success-subtle` | `#ECFDF5` | Green status card background, success badge fills |
| `warning` | `#F59E0B` | Pending doctor access requests, elevated heart rate flags |
| `warning-subtle` | `#FFFBEB` | Yellow warning banner fill, pending badge fills |
| `destructive` | `#EF4444` | Allergy conflict warnings, access revocation, dangerous interactions |
| `destructive-subtle`| `#FEF2F2` | Allergy warning card fill, destructive alert banners |
| `border-default` | `#E2E8F0` | Default card borders, divider rules, text field borders |
| `border-focus` | `#0284C7` | Active focused input border (2px ring) |

### 1.2 Typography Hierarchy
Use System Font stack (`San Francisco` on iOS, `Roboto` on Android) via React Native default styling or loaded Inter fonts.

*   **Display / Hero Number:** 32pt / Bold / Monospace (`tracking-tight`) — Used for real-time vitals numbers (Heart Rate, SpO2).
*   **Header 1 (Screen Title):** 24pt / Bold / Leading: 30pt — Primary screen header.
*   **Header 2 (Section Card Title):** 18pt / SemiBold / Leading: 24pt — Card headers, modal titles.
*   **Header 3 (Subsections & Modules):** 15pt / SemiBold / Leading: 20pt — Field labels, list group headers.
*   **Body (Default Text):** 14pt / Regular / Leading: 20pt — Clinical summaries, notes, chat messages.
*   **Body Small (Metadata):** 12pt / Medium / Leading: 16pt — Timestamps, dosage metrics, pill badge labels.
*   **Caption:** 10pt / Medium / Leading: 14pt — Tab bar labels, form helper hints.

### 1.3 Metrics, Radii & Depth
*   **Touch Targets:** Minimum 44x44pt (iOS HIG) / 48x48dp (Android Material 3).
*   **Base Spacing Grid:** 4pt base grid (`p-1` = 4px, `p-2` = 8px, `p-4` = 16px, `p-6` = 24px).
*   **Corner Radii:**
    *   Buttons & Inputs: `rounded-xl` (12px).
    *   Cards & Modal Sheets: `rounded-2xl` (16px) or `rounded-3xl` (24px for bottom sheets).
    *   Status Badges & Chips: `rounded-full` (9999px).
*   **Shadows / Elevation:** Avoid heavy blurry drop-shadows. Use a border-first strategy:
    *   Default Card: `border border-slate-200 bg-white shadow-sm`.
    *   Floating Action Button (FAB): Elevated with `shadow-lg` (iOS: `shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 8`; Android: `elevation: 6`).

### 1.4 Haptic Feedback Patterns (`expo-haptics`)
*   **Selection:** Trigger `Haptics.selectionAsync()` on bottom tab taps, pill toggle selection, and stepper changes.
*   **Success:** Trigger `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` on scan upload completion, session save, and consent grant.
*   **Warning / Conflict:** Trigger `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` on medical contraindication or allergy match detection.
*   **Error / Danger:** Trigger `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)` on consent revocation or validation failure.

---

## 2. Navigation Architecture & Shell

### 2.1 Tab Bar Anatomy
The app uses a 5-item persistent bottom navigation bar anchored inside `apps/mobile/app/(tabs)/_layout.tsx`.
+-------------------------------------------------------------------------+
| [ (1) Vitals ]  [ (2) Assistant ]   [  (3)  ]   [ (4) Records ] [ (5) More ] |
|   Activity          Chat            [   +   ]      Profile        Settings  |
|                                     [ INTAKE]                               |
+-------------------------------------------------------------------------+
1.  **Tab 1: Activity (`app/(tabs)/activity.tsx`)**
    *   Icon: `Activity` (Lucide).
    *   Label: "Activity".
    *   Responsibility: Smartwatch/wearables vitals dashboard, daily AI health brief, historical metrics.
2.  **Tab 2: Chat (`app/(tabs)/chat.tsx`)**
    *   Icon: `MessageSquarePulse` (Lucide).
    *   Label: "Assistant".
    *   Responsibility: Interactive health analyst chat, contextual queries over patient timeline.
3.  **Tab 3: Intake / Session Capture (`app/(tabs)/intake.tsx` - Action Tab)**
    *   Component: Custom elevated Floating Center Button.
    *   Position: Centers in the bottom bar, vertically offset 18px above the tab bar plane.
    *   Dimensions: 56x56pt circular button.
    *   Visual: Background `bg-primary` (`#0284C7`), foreground white `Plus` or `ScanLine` icon, surrounded by a 4px white ring border.
    *   Action: Triggers the Clinical Intake Action Sheet (Select: "Log Doctor Visit" vs "Scan Document").
4.  **Tab 4: Records (`app/(tabs)/records.tsx`)**
    *   Icon: `FolderHeart` (Lucide).
    *   Label: "Records".
    *   Responsibility: Filterable archive of all extracted doctor sessions, prescriptions, lab reports, allergy tags, and doctor access consent rules.
5.  **Tab 5: Settings (`app/(tabs)/settings.tsx`)**
    *   Icon: `SlidersHorizontal` (Lucide).
    *   Label: "Settings".
    *   Responsibility: User identity, connected devices pairing, biometric lock settings, theme switcher, logout.

### 2.2 Navigation Constraints & Safety Areas
*   **Bottom Safe Area:** Tab bar container must use `useSafeAreaInsets().bottom` padding to prevent overlapping the iOS home indicator bar or Android navigation gestures.
*   **Top Safe Area:** Every root tab screen must start with `useSafeAreaInsets().top` to avoid notch/Dynamic Island clipping.
*   **Modal Presentation:** Clinical logging, document scanning, and session edits open as presentation modals (`presentation: 'modal'` in Expo Router Stack) with a standard drag-down handle and an explicit top-right "Close" / "Cancel" text button.

---

## 3. Screen-by-Screen UI & UX Specifications

### 3.1 Authentication Flow (`apps/mobile/app/(auth)/`)

#### Screen 1: Login / Sign Up (`login.tsx` & `signup.tsx`)
*   **Visual Layout:**
    *   Top: SehatKosh emblem with clean typography. Header: "Your Health, Unified". Subtext: "Clinical-grade personal health ledger".
    *   Input Group (Single Card container):
        *   Field 1: Email or Medical ID Number (Keyboard type: `email-address`, auto-capitalization: `none`).
        *   Field 2: Password (Password visibility toggle icon).
    *   Action Button: Primary blue button (`h-12 w-full rounded-xl bg-primary`), text: "Continue".
    *   Secondary Action: "Sign in with Biometrics" (FaceID / Fingerprint icon button) visible if `LocalAuthentication.hasHardwareAsync()` is true.
    *   Footer: Toggle link: "New to SehatKosh? Create an account".
*   **Defensive UX & Validation:**
    *   "Continue" button remains visually disabled (`opacity-50`) until email passes RFC-5322 regex and password is >= 8 characters.
    *   On 3 consecutive failed attempts, display a persistent banner with password reset guidance.

---

### 3.2 Tab 1: Activity & Daily Brief (`app/(tabs)/activity.tsx`)

#### Header Area
*   Left: Patient avatar, greeting "Hello, Ahsan", current date ("Wednesday, Sep 2").
*   Right: Wearable sync pill badge. Shows `Watch` icon with a green pulse dot if connected ("Synced 2m ago") or amber dot if disconnected ("Tap to sync").

#### Component 1: Daily AI Health Brief Card
*   **Placement:** Top of the scrolling view.
*   **Visual:** Card container with `#F0FDF4` (success-subtle) fill, 1px border `#BBF7D0`. Top label row: `Sparkles` icon with text "DAILY CLINICAL SUMMARY".
*   **Content:**
    *   3-4 bulleted observations synthesized from latest vitals + active prescriptions.
    *   *Example bullet:* "Resting Heart Rate normalized to 72 BPM after morning dose of Atenolol."
    *   *Example bullet:* "Hydration alert: High ambient temp logged; maintain intake with current antibiotic regimen."
*   **Action:** "View Timeline" text link at the bottom right of the card navigating to Records.

#### Component 2: Wearables Vitals Grid (2x2 Matrix)
*   **Card 1 (Resting Heart Rate):**
    *   Top row: `HeartPulse` icon (Red `#EF4444`), title "Heart Rate".
    *   Value row: "72" (32pt Bold monospace), unit "BPM" (14pt muted).
    *   Bottom row: Sparkline mini-graph of the last 12 hours. Status text: "Within normal range (60-100)".
*   **Card 2 (Blood Oxygen / SpO2):**
    *   Top row: `Activity` icon (Blue `#0284C7`), title "Blood Oxygen".
    *   Value row: "98" (32pt Bold monospace), unit "%" (14pt muted).
    *   Bottom row: Status indicator pill "Optimal".
*   **Card 3 (Daily Steps):**
    *   Top row: `Footprints` icon (Slate `#475569`), title "Steps".
    *   Value row: "6,420" (24pt Bold), sub-text "/ 10,000 goal".
    *   Bottom row: Horizontal progress bar (`h-2 rounded-full bg-slate-100`, filled with `bg-primary`).
*   **Card 4 (Sleep Duration):**
    *   Top row: `Moon` icon (Indigo `#6366F1`), title "Sleep".
    *   Value row: "7h 24m" (24pt Bold).
    *   Bottom row: Subtext: "85% Deep/REM sleep efficiency".

#### Component 3: Today's Dosage Schedule
*   Vertical card list titled "Active Regimen Today".
*   Item layout: Time pill ("08:00 AM"), Drug Name ("Amoxicillin 500mg"), Instruction ("1 Cap - After breakfast").
*   Interactive Checkbox: Tapping checks the item, triggers `Haptics.selectionAsync()`, applies strike-through to the drug name, and updates local state.

---

### 3.3 Tab 2: Health Assistant Chat (`app/(tabs)/chat.tsx`)

#### Header Area
*   Title: "Clinical Analyst".
*   Subtitle: "Context-aware queries over your records".
*   Right Action: `RotateCcw` icon button to clear context / reset conversation (triggers confirmation alert).

#### Chat Stream Body
*   `FlatList` inverted for standard messenger flow.
*   **Patient Messages:** Right-aligned, background `bg-primary` (`#0284C7`), text white, `rounded-2xl rounded-tr-sm`.
*   **AI Analyst Messages:** Left-aligned, background `bg-slate-100`, text `text-slate-900`, `rounded-2xl rounded-tl-sm`.
    *   Supports Markdown parsing: bold drug names, bullet lists for clinical explanations.
    *   Citation Footnote: If referencing an extracted session, render a small clickable badge at the bottom of the bubble: `Prescription #medrx-001 (Aug 30)`. Tapping opens that session modal.
*   **Suggested Prompt Chips:** Displayed horizontally when conversation is empty:
    *   "What are my current antibiotic interactions?"
    *   "Summarize my doctor visit from last week."
    *   "Show my resting heart rate trend for this month."

#### Input Bar Container
*   Pinned above the keyboard via `KeyboardAvoidingView`.
*   Left: `Paperclip` icon (Attach report image).
*   Center: Expanding `TextInput` (Max 5 lines, placeholder "Ask about your prescriptions, vitals...").
*   Right: Circular Send button (`w-10 h-10 rounded-full bg-primary`), disabled and greyed out if input is empty.

---

### 3.4 Tab 3: Intake Hub & Clinical Processing

When user taps the center `+` button, present an iOS-style Action Sheet with two explicit choices:
1.  **Log Doctor Visit (Scribe Mode)**
2.  **Scan Document (Camera / Files)**

---

#### Flow A: Doctor Visit Scribe (`app/intake/doctor-session.tsx`)
This flow turns conversational descriptions of medical visits into clinical records.

*   **Step 1: Input & Recording View**
    *   *Top Navigation:* "Cancel" (left), "Step 1 of 2: Consultation Intake" (center), "Next" (right, enabled once minimum inputs are provided).
    *   *Field 1 (Structured Metadata):*
        *   Doctor Name Input (e.g., "Dr. Tariq Khan").
        *   Specialty / Clinic Input (e.g., "Internal Medicine, Shifa Hospital").
        *   Visit Date: DatePicker modal defaulting to today.
    *   *Field 2 (Conversational Discussion Area):*
        *   A large card container with clear instructional copy:
            *   Header: "What was discussed during your visit?"
            *   Helper text: "Tell us in plain words. Mention symptoms you reported, what the doctor diagnosed, and any changes to your medication."
        *   `TextInput` area (`h-44`, multiline, top-aligned text).
        *   Voice Memo Alternative: Direct microphone button below the text area: "Hold to record consultation notes" (uses `expo-av` for audio capture).
*   **Step 2: Review & LLM Transformation (`app/intake/session-preview.tsx`)**
    *   Loading State: While the LLM processes conversational inputs, display a skeleton loader with pulsating status messages: "Structuring clinical notes...", "Extracting diagnosis codes...", "Checking SNOMED catalog...".
    *   *Segmented Control (Tabs at top):*
        *   Tab A: **Clinical Summary (Doctor-Facing SOAP)**
        *   Tab B: **Your Original Notes (Raw)**
    *   *Under Tab A (Structured SOAP Output):*
        *   **Subjective (S):** Extracted patient symptoms and chief complaints in bullet points.
        *   **Objective (O):** Vitals recorded during visit (BP, Weight, Pulse).
        *   **Assessment (A):** Suspected or confirmed diagnosis with provisional ICD/SNOMED codes.
        *   **Plan (P):** Prescribed drugs, recommended lifestyle changes, diagnostic tests ordered.
    *   *Editable Fields:* Every bullet has a small `Edit2` pencil icon. Tapping opens an inline text editor so the patient can correct any hallucinated or misheard details.
    *   *Action Bar (Sticky Bottom):*
        *   Secondary Button: "Re-record / Discard".
        *   Primary Button: "Save to My Records" (`bg-primary text-white`).

---

#### Flow B: Document Scanner & Split-Screen Review (`app/intake/scan-document.tsx`)

*   **Step 1: Document Capture Interface**
    *   Full-screen `expo-camera` viewport.
    *   Visual Framing Guide: High-contrast white rectangular box (`border-2 border-dashed border-white rounded-2xl`) showing the document boundary.
    *   Overlay text: "Align prescription or lab report inside the box".
    *   Bottom Control Bar:
        *   Left: `ImagePicker` trigger to import from Photo Library.
        *   Center: 72x72pt circular Shutter button (`border-4 border-white bg-white/20`).
        *   Right: Flash toggle (`Zap` / `ZapOff`).
*   **Step 2: Split-Screen OCR Verification (`app/intake/ocr-verify.tsx`)**
    *   *Screen Distribution:*
        *   **Top 40% Viewport:** Pinch-to-zoom interactive viewer displaying the captured prescription image. Allows the user to inspect handwritten notes against extracted text.
        *   **Bottom 60% Viewport:** Scrollable form containing the extracted fields.
    *   *Extracted Fields Structure:*
        *   Section Header: "Extracted Medications (2 Detected)".
        *   Card 1:
            *   Drug Name input (e.g., "Amoxicillin").
            *   Strength input (e.g., "500mg").
            *   Frequency / Timing input (e.g., "3 times daily").
            *   Duration input (e.g., "7 days").
            *   Delete button (`Trash2` icon) to discard misidentified lines.
        *   Action: `+ Add Medication Manually` button.
    *   **CRITICAL UX: Allergy & Interaction Interceptor Banner:**
        *   If an extracted drug matches a patient's known allergy (e.g., Patient is allergic to Penicillin, and Amoxicillin is extracted):
        *   Render a fixed top banner with deep crimson styling (`bg-red-600 text-white p-4 rounded-xl shadow-lg`):
            *   Icon: `AlertTriangle` in bold.
            *   Message: "**CONTRAINDICATION DETECTED**: Amoxicillin is a penicillin-class antibiotic. Your profile lists a severe allergy to Penicillin."
            *   User options: "Flag to Doctor" or "Remove Medication".
            *   The "Confirm & Save" button is disabled until the warning is explicitly acknowledged via a checkbox: `[ ] I acknowledge this allergy conflict`.

---

#### Component: Session Card Display (`components/SessionCard.tsx`)
Used in the timeline inside the Records Tab.

*   Container: `rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50`.
*   Top Row: Doctor Name ("Dr. Tariq Khan") on the left; Date ("Aug 30, 2026") on the right in muted small text.
*   Second Row: Clinic / Facility ("Shifa International • Cardiology").
*   Middle Section (Badges): Horizontal tag list:
    *   `[Prescription: 2 Drugs]` (Blue badge).
    *   `[Diagnosis: Bronchitis]` (Slate badge).
    *   `[Document Attached]` (Green badge with paperclip icon).
*   Summary Line: 2-line truncated text preview of the doctor's clinical notes.
*   Tap Behavior: Navigates to `app/sessions/[id].tsx` rendering the full un-truncated SOAP view, attachments viewer, and FHIR export option.

---

### 3.5 Tab 4: Records, Personalization & Consent (`app/(tabs)/records.tsx`)

Use a top sticky Segmented Control with two views:
1.  **Clinical History (Sessions & Prescriptions)**
2.  **Health Profile (Allergies, Vitals Baseline, Doctor Approvals)**

#### Segment 1: Clinical History
*   Search & Filter Bar:
    *   Search input: "Search by doctor, disease, or medication...".
    *   Filter Chips: Horizontal scroll (`All`, `Doctor Visits`, `Prescriptions`, `Lab Reports`, `X-Rays`).
*   List Container: Chronologically grouped `FlatList` (e.g., "August 2026", "July 2026") rendering `SessionCard` components.
*   Empty State: When no records exist, show an empty state graphic, text "No records stored yet", and a button "Scan your first prescription".

#### Segment 2: Health Profile & Doctor Consent
*   **Module A: Known Allergies & Contraindications**
    *   Header: "Allergies & Sensitivities" with a `+ Add Allergy` button.
    *   Pill Grid: Pill components rendering the allergen name and severity badge:
        *   Pill 1: "Penicillin" • `Severe (Anaphylaxis)` (Red fill `#FEF2F2`, red text).
        *   Pill 2: "NSAIDs" • `Mild (Rash)` (Yellow fill `#FFFBEB`, amber text).
    *   Tap behavior: Tapping an allergy pill opens an edit/delete modal sheet.
*   **Module B: Doctor Access & Notification Approvals (Consent Engine)**
    *   Header: "Active Doctor Access Requests".
    *   Card Container: Shows doctors or hospitals requesting permission to view the patient's record.
    *   Item Anatomy:
        *   Doctor Avatar & Details: "Dr. Ayesha Malik (Cardiology • PIMS Hospital)".
        *   Requested Scope: "Full History • 24 Hours Access".
        *   Timestamp: "Requested 15 minutes ago".
        *   Button Pair:
            *   Reject (`h-10 px-4 rounded-xl border border-slate-300 text-slate-700`): Revokes request immediately.
            *   Approve (`h-10 px-4 rounded-xl bg-primary text-white`): Opens Access Duration Picker ("24 Hours", "7 Days", "Permanent").
    *   Active Access List: Shows currently authorized clinicians with an expiration countdown timer ("Expires in 18h 42m") and a red "Revoke Access" link.

---

### 3.6 Tab 5: Account & Settings (`app/(tabs)/settings.tsx`)

*   **Section 1: User Profile Summary**
    *   Row with circular patient photo, full name ("Muhammad Ahsan"), Medical Identifier (`SK-8921-X`), and Blood Type badge (`O+`).
    *   "Edit Personal Information" button.
*   **Section 2: Wearable Devices & Hardware Connections**
    *   Row 1: "Apple Health / Health Connect" (Status: "Connected", Green toggle switch).
    *   Row 2: "Bluetooth Smart Bands" (Status: "Fitbit Charge 6 paired", Chevron navigating to scanner).
*   **Section 3: Security & Privacy**
    *   Row 1: "Require FaceID / Biometrics on Launch" (Toggle switch).
    *   Row 2: "Export Complete FHIR R4 Bundle (JSON)" (Triggers `expo-sharing` share sheet).
*   **Section 4: App Preferences**
    *   Theme Mode: Segmented picker (`Light`, `Dark`, `System Default`).
    *   Push Notifications: Manage reminders for medication times and doctor access requests.
*   **Section 5: Account Session**
    *   "Log Out" Button (`h-12 w-full rounded-xl bg-slate-100 text-red-600 font-semibold`).
    *   Tapping triggers a native modal alert: "Are you sure you want to log out? Local mock data will be safely cached."

---

## 4. Defensive UX, Guardrails & Interaction Patterns

### 4.1 Form Protection & Accidental Loss Prevention
*   **Unsaved Draft Interceptor:** If a user types text into the "Doctor Session Scribe" or edits OCR fields and attempts to tap "Cancel" or drag down the modal:
    *   Intercept the gesture.
    *   Display an Action Sheet:
        *   "Discard Changes" (Destructive, Red).
        *   "Save as Draft" (Caches form state to local `AsyncStorage`).
        *   "Keep Editing" (Dismisses sheet).
*   **Auto-Save:** Form inputs on the Scribe and OCR verification screens auto-persist to local state every 3 seconds.

### 4.2 Network & Offline Resilience
*   **Offline Mode Indicator:** When device loses network connectivity, display a compact top status pill below the status bar: "Offline Mode • Working from local cache".
*   **Optimistic UI Updates:** When approving doctor access or adding an allergy, update the UI immediately. Queue backend network requests via TanStack React Query mutations with retry policies.

### 4.3 Input Validation State Rules
*   Every form field must feature 3 distinct visual states:
    1.  **Default:** Border `border-slate-200`, background `bg-white`.
    2.  **Focused:** Border `border-sky-600`, ring `ring-2 ring-sky-100`.
    3.  **Invalid:** Border `border-red-500`, background `bg-red-50/20`, helper text below the field in red (`text-xs text-red-600 font-medium`).

---

## 5. Platform-Specific Nuances (iOS vs Android)

| Feature | iOS Implementation | Android Implementation |
| :--- | :--- | :--- |
| **Keyboard Management** | `KeyboardAvoidingView` with `behavior="padding"` | `KeyboardAvoidingView` with `behavior="height"` + `softwareKeyboardLayoutMode="adjustResize"` |
| **Haptics** | Subtle taptic feedback via standard UI impact engines | Standard device vibrator motor with slightly dampened intensity |
| **Hardware Back Button** | Handled natively by interactive swipe-from-left edge gesture | Explicit `BackHandler.addEventListener` hook to intercept navigation during unsaved forms |
| **Modals** | Native page sheet (`presentation: 'modal'`) with visible rubber-banding | Full-screen dialog with an explicit top-left arrow or cross button |
| **Blur / Glassmorphism** | `expo-blur` component for translucent tab bar backgrounds | Solid white (`#FFFFFF`) with a 1px top border to prevent GPU rendering lag |

---

## 6. Directory Structure & File Manifest for Implementation

The following files must be generated inside `apps/mobile/` to satisfy this architecture:


apps/mobile/
├── app/
│   ├── _layout.tsx                     # Global Root Stack, QueryClient, Theme provider
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx                   # Auth login screen
│   │   └── signup.tsx                  # New user registration
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # Persistent 5-button bottom navigation bar
│   │   ├── activity.tsx                # Tab 1: Vitals dashboard & Daily AI Brief
│   │   ├── chat.tsx                    # Tab 2: Health Assistant Analyst Chat
│   │   ├── intake.tsx                  # Tab 3: Center FAB Action Router
│   │   ├── records.tsx                 # Tab 4: History timeline & Allergy/Consent profile
│   │   └── settings.tsx                # Tab 5: Personal profile, devices & security
│   ├── intake/
│   │   ├── doctor-session.tsx          # Conversational intake scribe form
│   │   ├── session-preview.tsx         # SOAP clinical summary review screen
│   │   ├── scan-document.tsx           # Full-screen camera & image picker
│   │   └── ocr-verify.tsx              # Split-screen OCR review & allergy interceptor
│   └── sessions/
│       └── [id].tsx                    # Expanded clinical session detail view
├── components/
│   ├── ui/                             # React Native Reusables / Primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   └── dialog.tsx
│   ├── ActivityGraph.tsx               # Sparkline and metrics graph component
│   ├── AllergyPill.tsx                 # Severity-coded allergy badge
│   ├── ConsentCard.tsx                 # Doctor authorization card with timer
│   ├── DailyBriefCard.tsx              # Green AI summary card
│   ├── DosageItem.tsx                  # Interactive daily medication checkbox item
│   ├── SessionCard.tsx                 # Timeline session presentation card
│   └── VitalsCard.tsx                  # 2x2 grid vitals metric box
├── hooks/
│   ├── useVitals.ts                    # Wearable data hook (mock/sensor fallback)
│   ├── useSessions.ts                  # Query/mutation hooks for clinical sessions
│   └── useConsent.ts                   # Doctor access approval state manager
└── services/
    ├── apiClient.ts                    # Dynamic mock/live API transport layer
    └── healthKitService.ts             # Apple Health / Google Health Connect adapter
