# SEHATKOSH_MOBILE_UI_UX_REFACTOR_PLAN.md

# Mobile Application Frontend Implementation Plan

---

## 1. Scope & Isolation Directives

* **Target Scope:** `apps/mobile/` exclusively.


* **Protected Directories:** Do NOT touch `apps/doctor-web/`, `services/`, `packages/tailwind-config/`, or root configuration files (`package.json`, `pnpm-workspace.yaml`, `turbo.json`).


* **Dependencies Constraint:** Do NOT run `npm install` or `pnpm add`. Utilize the packages already pinned in `apps/mobile/package.json` (`expo@54.0.37`/Expo SDK compatibility, `nativewind`, `react-native-safe-area-context`, `react-native-reanimated`, `expo-camera`, `lucide-react-native`).



---

## 2. Root Insets, Screen Headers & Gesture Foundations

### 2.1 Unified Top-Inset Header Pattern

Modern cutouts and Dynamic Islands cause content collision if headers rely on static margins.

* **Implementation Rule:** Every root tab screen and navigation modal must consume `useSafeAreaInsets()` from `react-native-safe-area-context`.


* **Global Top Spacer:** Wrap top headers in a dedicated `ScreenHeader` or standard container with:
```tsx
const insets = useSafeAreaInsets();
// Consistent calculation across Android punch-holes & iOS Dynamic Island
const topPadding = Math.max(insets.top, 16) + 8;

```


* **Target Files:**
* `apps/mobile/app/(tabs)/activity.tsx`
* `apps/mobile/app/(tabs)/chat.tsx`
* `apps/mobile/app/(tabs)/records.tsx`
* `apps/mobile/app/(tabs)/settings.tsx`
* `apps/mobile/app/sessions/[id].tsx`



### 2.2 Global iOS & Android Swipe-Back Gestures

Ensure edge swipe gestures reliably pop screens from the navigation stack.

* **File:** `apps/mobile/app/_layout.tsx`

* **Configuration:** Update root `Stack` options to enable interactive drag-to-dismiss on iOS and native edge slide animations on Android:
```tsx
<Stack
  screenOptions={{
    headerShown: false,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    animation: "slide_from_right",
    contentStyle: { backgroundColor: "#FFFFFF" },
  }}
>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen 
    name="sessions/[id]" 
    options={{ 
      gestureEnabled: true,
      animation: "slide_from_right"
    }} 
  />
  <Stack.Screen 
    name="intake/scan-document" 
    options={{ 
      presentation: "fullScreenModal",
      gestureEnabled: false // Camera requires controlled dismissal
    }} 
  />
  <Stack.Screen 
    name="intake/ocr-verify" 
    options={{ 
      gestureEnabled: true,
      presentation: "card"
    }} 
  />
</Stack>

```



---

## 3. Screen-by-Screen Fixes & UX Upgrades

### 3.1 OCR Extracted Prescription Screen (`apps/mobile/app/intake/ocr-verify.tsx`)

#### Problems Identified

1. The sheet header collides with camera cutouts when dragged to full screen.
2. Bottom buttons ("Save Record", "Add Field") overlap the lowest inputs; users cannot scroll past the last field.

#### Structural Fixes

* **Top Clamping:** Lock the bottom sheet's maximum snap point below the device status bar:
```tsx
const insets = useSafeAreaInsets();
const snapPoints = useMemo(() => ["50%", "88%"], []);

```


* **Scroll Inset Protection:** Replace fixed padding with calculated bottom-safe padding inside the `ScrollView` or `BottomSheetScrollView`:
```tsx
<ScrollView
  contentContainerStyle={{
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: insets.bottom + 120, // Clears floating action bar completely
  }}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
  {/* Extracted Drug Cards & Manually Added Fields */}
</ScrollView>

```


* **Floating Action Bar:** Position the final save button in a sticky glassmorphism bottom container:
```tsx
<View 
  style={{ paddingBottom: Math.max(insets.bottom, 16) }} 
  className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200 px-5 pt-3"
>
  <Button className="w-full h-12 bg-sky-600 rounded-xl">
    <Text className="text-white font-semibold">Save Clinical Record</Text>
  </Button>
</View>

```



---

### 3.2 Chatbot Input Screen (`apps/mobile/app/(tabs)/chat.tsx`)

#### Problems Identified

Tapping the message `TextInput` opens the soft keyboard, pushing the input below the viewport where it remains hidden while typing.

#### Structural Layout Architecture

Use a dual-platform `KeyboardAvoidingView` configured with correct offset calculations:

```tsx
import { Platform, KeyboardAvoidingView, View, TextInput, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Top Header */}
      <View className="px-5 py-3 border-b border-slate-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-slate-900">Health Assistant</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {/* Message Feed */}
        <FlatList
          data={messages}
          inverted
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          renderItem={({ item }) => <ChatMessage message={item} />}
          keyExtractor={(item) => item.id}
        />

        {/* Sticky Input Bar */}
        <View 
          className="border-t border-slate-200 bg-white px-4 py-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2">
            <TextInput
              className="flex-1 text-slate-900 text-base max-h-28"
              placeholder="Ask about your prescriptions, vitals..."
              placeholderTextColor="#94A3B8"
              multiline
            />
            <TouchableOpacity className="ml-2 bg-sky-600 p-2.5 rounded-xl">
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

```

---

### 3.3 Camera Viewport & Controls (`apps/mobile/app/intake/scan-document.tsx`)

#### Problems Identified

The shutter button is rendered inside an uncontrolled flex container, causing it to shoot to the top of the screen on devices with large aspect ratios.

#### Layout Overhaul

Pin the camera controls strictly to the viewport bottom using an absolute positioning layer over the camera preview:

```tsx
<View className="flex-1 bg-black">
  {/* 1. Camera Viewport fills entire container */}
  <CameraView style={StyleSheet.absoluteFillObject} facing="back" />

  {/* 2. Top Header Controls (Dismiss & Flash) */}
  <View 
    style={{ paddingTop: insets.top + 8 }}
    className="absolute top-0 left-0 right-0 px-6 flex-row justify-between items-center z-10"
  >
    <TouchableOpacity 
      onPress={() => router.back()}
      className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
    >
      <X size={22} color="#FFFFFF" />
    </TouchableOpacity>
    <TouchableOpacity 
      onPress={toggleFlash}
      className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
    >
      <Flashlight size={22} color={flash ? "#FBBF24" : "#FFFFFF"} />
    </TouchableOpacity>
  </View>

  {/* 3. Document Framing Box Guide */}
  <View className="flex-1 items-center justify-center px-8 pointer-events-none">
    <View className="w-full aspect-[3/4] border-2 border-dashed border-white/70 rounded-2xl" />
    <Text className="text-white/80 text-xs font-medium mt-3 bg-black/50 px-3 py-1 rounded-full">
      Fit prescription or lab report within boundary
    </Text>
  </View>

  {/* 4. Bottom Controls Anchor */}
  <View 
    style={{ paddingBottom: Math.max(insets.bottom, 24) }}
    className="absolute bottom-0 left-0 right-0 px-8 flex-row justify-between items-center bg-black/40 pt-6"
  >
    {/* Gallery Picker */}
    <TouchableOpacity onPress={pickFromGallery} className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
      <ImageIcon size={22} color="#FFFFFF" />
    </TouchableOpacity>

    {/* Center Shutter Button */}
    <TouchableOpacity 
      onPress={takePicture}
      className="w-20 h-20 rounded-full border-4 border-white items-center justify-center bg-transparent"
    >
      <View className="w-16 h-16 rounded-full bg-white" />
    </TouchableOpacity>

    {/* Spacer to balance gallery button */}
    <View className="w-12 h-12" />
  </View>
</View>

```

---

### 3.4 Records Tab Clean-Up & Clinical History (`apps/mobile/app/(tabs)/records.tsx`)

#### Changes Required

* **Remove Filter Pills:** Eliminate the `[All, Doctor Visits, Prescriptions]` horizontal filter chips from the Clinical History tab.
* **Enriched Chronological Encounter Feed:** Render realistic, comprehensive dummy clinical records.
* **Interactive Session Cards:** Every card routes to `app/sessions/[id].tsx` with gesture-backed push transitions.

#### Enriched Records Mock Dataset

Add these realistic clinical fixtures to `apps/mobile/services/mockRecords.ts`:

| ID | Title / Doctor | Facility & Specialty | Date | Primary Output |
| --- | --- | --- | --- | --- |
| `enc-001` | Dr. Tariq Khan | Shifa International • Cardiology | Aug 30, 2026 | Atenolol 50mg, Lifestyle modification, ECG ordered |
| `enc-002` | Dr. Ayesha Malik | PIMS Hospital • Pulmonology | Aug 12, 2026 | Amoxicillin 500mg, Salbutamol Inhaler (Chest congestion) |
| `enc-003` | Dr. Bilal Qureshi | Kulsum Hospital • Internal Med | Jul 28, 2026 | Routine Health Checkup • Vitals normal, CBC Lab ordered |
| `enc-004` | Dr. Samina Raza | Shifa International • Dermatology | Jun 14, 2026 | Desonide 0.05% Topical Cream • Contact Dermatitis |

---

### 3.5 Dedicated Session Detail Dossier (`apps/mobile/app/sessions/[id].tsx`)

Create an intuitive clinical encounter review screen:

* **Header Section:** Back button (`ArrowLeft`), Doctor Name, Clinic Name, Date, and Encounter Type badge.
* **SOAP Note Clinical Structure:**
* `Subjective (S)`: Chief complaints and symptoms reported.
* `Objective (O)`: Blood pressure and vitals logged at time of consultation.
* `Assessment (A)`: Confirmed or provisional ICD-10 diagnosis.
* `Plan (P)`: Prescribed medication cards (Drug name, form, strength, frequency, duration).


* **Attached Document Drawer:** Scanned thumbnail with zoom modal trigger.
* **Export Action:** Dedicated "Export HL7 FHIR Standard (JSON)" button with native share sheet trigger (`expo-sharing`).

---

### 3.6 Health Profile Tab vs. Settings Architecture

#### Clinical Information Architecture & Separation of Concerns

```
[ Records Tab -> Segment 2: Health Profile ]
  ├── Physiological Biomarkers (Height, Weight, Calculated BMI, Blood Group)
  ├── Active Chronic Conditions (Hypertension, Asthma)
  └── Allergies & Sensitivities Hub (+ Add Allergy interactive modal)

[ Settings Tab ]
  ├── Account & Emergency Contacts
  ├── Connected Hardware & Wearables (Apple Health / Health Connect / Bluetooth)
  ├── Clinical Access & Approvals (Relocated Doctor Consent Engine)
  ├── Data Standards & HL7 Export
  └── Security (FaceID / Biometrics)

```

#### 1. Allergies Management (Health Profile)

* Render existing allergies with severity chips:
* `Penicillin` • `Severe (Anaphylaxis Risk)` (Crimson `#EF4444`)
* `NSAIDs` • `Mild (Skin Rash)` (Amber `#F59E0B`)


* **`+ Add Allergy` Button:** Opens an accessible bottom dialog (`components/AllergyModal.tsx`):
* Allergen Name input (with autocomplete chips: *Penicillin*, *Sulfa*, *Aspirin*, *Peanuts*).
* Reaction Description (e.g., "Hives", "Breathing difficulty").
* Severity Selector: 3 segment pills (`Mild`, `Moderate`, `Severe`).
* Save button with optimistic local state update and success haptic feedback (`expo-haptics`).



#### 2. Physiological Vitals Baseline (Health Profile)

* **Grid layout (2x2):**
* Height: `178 cm`
* Weight: `74.5 kg`
* Calculated BMI: `23.5` (`Normal Range` - Green indicator)
* Blood Group: `O Positive`



#### 3. Relocate Doctor Access Engine (To Settings)

* **Remove** "Doctor Access Approvals" entirely from `app/(tabs)/records.tsx`.
* **Add** "Clinical Access & Approvals" inside `app/(tabs)/settings.tsx`:
* Displays pending doctor access requests from hospital registrars.
* Displays currently authorized physicians with active countdown timers (`Expires in 3h 15m`).
* Instant `Revoke` button.



---

### 3.7 Settings Page Export Standardization

* **File:** `apps/mobile/app/(tabs)/settings.tsx`
* **Current Copy:** "Export Complete FHIR R4 Bundle (JSON)"
* **New Normalized Copy:**
* Card Title: **Export HL7 Health Record**
* Subtitle: **Standardized HL7 FHIR R4 JSON format compatible with hospital EHR systems**
* Icon: `FileCode2` (Lucide)
* Trigger: Dispatches JSON payload generation and opens native file share sheet.



---

### 3.8 Center Floating Action Button (`+`) Intake Flow Redesign

#### UX Problem

Presenting an evenly weighted choice between "Log Doctor Visit" and "Scan Prescription" causes choice paralysis and breaks clinical sequence. A prescription is an artifact *resulting* from a consultation.

#### Refactored Two-Step Linear Journey

```
[ User Taps Center (+) FAB ]
             │
             ▼
[ Step 1: Doctor Consultation Scribe (app/intake/doctor-session.tsx) ]
  • Enter Doctor / Clinic Name & Reason for Visit
  • Record discussion via Voice Memo or Plain English Text Area
  • Primary CTA at bottom: "Proceed to Attach Prescription (Scan/Upload)"
  • Secondary text link: "Skip Document & Save Consultation Only"
             │
             ▼
[ Step 2: Camera Capture / Prescription Upload (app/intake/scan-document.tsx) ]
  • Camera opens with framing guide
  • Snap image or select PDF/Gallery
             │
             ▼
[ Step 3: Combined Split-Screen Verification (app/intake/ocr-verify.tsx) ]
  • Top: Scanned Prescription viewer
  • Bottom: Editable AI-extracted SOAP summary + Medication fields

```

#### Center Button Quick Action Sheet (If retaining modal launch)

If an action sheet is triggered on `+` tap, configure visual hierarchy so the Consultation Log is visually dominant:

```tsx
<View className="p-6 bg-white rounded-t-3xl">
  <Text className="text-xl font-bold text-slate-900 mb-1">New Clinical Encounter</Text>
  <Text className="text-sm text-slate-500 mb-6">Log today's doctor consultation and link medical documents.</Text>

  {/* Primary Highlighted Action (80% Visual Emphasis) */}
  <TouchableOpacity 
    onPress={() => { dismiss(); router.push('/intake/doctor-session'); }}
    className="w-full bg-sky-600 rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
  >
    <View className="flex-row items-center flex-1 pr-4">
      <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center mr-4">
        <Stethoscope size={24} color="#FFFFFF" />
      </View>
      <View>
        <Text className="text-white font-bold text-base">Log Doctor Consultation</Text>
        <Text className="text-white/80 text-xs">Record discussion, advice & attach prescription</Text>
      </View>
    </View>
    <ChevronRight size={20} color="#FFFFFF" />
  </TouchableOpacity>

  {/* Secondary Auxiliary Action */}
  <TouchableOpacity 
    onPress={() => { dismiss(); router.push('/intake/scan-document'); }}
    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex-row items-center justify-between"
  >
    <View className="flex-row items-center flex-1 pr-4">
      <View className="w-12 h-12 rounded-xl bg-slate-200 items-center justify-center mr-4">
        <ScanLine size={24} color="#475569" />
      </View>
      <View>
        <Text className="text-slate-800 font-semibold text-base">Quick Scan Document Only</Text>
        <Text className="text-slate-500 text-xs">Digitize lab report or past prescription image</Text>
      </View>
    </View>
    <ChevronRight size={20} color="#94A3B8" />
  </TouchableOpacity>
</View>

```

---

## 4. Mobile File Modification Manifest

The following files inside `apps/mobile/` must be modified or created:

| File Path | Action | Scope of Work |
| --- | --- | --- |
| `apps/mobile/app/_layout.tsx`<br> | **MODIFY** | Configure gesture swipe-back (`gestureEnabled: true`, `fullScreenGestureEnabled: true`), declare session detail routes.

 |
| `apps/mobile/app/(tabs)/chat.tsx` | **MODIFY** | Fix `KeyboardAvoidingView` layout, add safe area insets to container and input bar. |
| `apps/mobile/app/(tabs)/records.tsx` | **MODIFY** | Remove `[All, Doctor Visits, Prescriptions]` filters. Add rich dummy cards. Move doctor consent engine to Settings. Add Height/Weight/BMI card. |
| `apps/mobile/app/(tabs)/settings.tsx` | **MODIFY** | Add "Clinical Access & Approvals" section (relocated consent manager). Standardize export label to "Export HL7 Health Record (JSON)". |
| `apps/mobile/app/intake/scan-document.tsx` | **MODIFY** | Fix layout positioning; anchor shutter button and gallery controls to viewport bottom. |
| `apps/mobile/app/intake/ocr-verify.tsx` | **MODIFY** | Fix top cutout collision on drag sheet; add safe-area bottom scroll insets. |
| `apps/mobile/app/intake/doctor-session.tsx` | **MODIFY** | Add linear intake step: consultation scribe details with direct CTA linking to prescription capture. |
| `apps/mobile/app/sessions/[id].tsx` | **NEW/MODIFY** | Implement clinical encounter dossier view (SOAP breakdown, medications, attached scan viewer, HL7 export). |
| `apps/mobile/components/AllergyModal.tsx` | **NEW** | Interactive dialog to add allergen name, reaction type, and severity tag with haptic feedback. |
| `apps/mobile/services/mockRecords.ts` | **NEW** | Enriched clinical history records dataset (Cardiology, Pulmonology, Dermatology encounters). |

---

## 5. Verification Checklist for IDE Assistant

1. **Top Insets:** Verify that on screens with camera notches or Dynamic Islands, titles and top-row icons have at least 16px of clearance from the status bar.
2. **Keyboard Behavior:** Navigate to Tab 2 (`Assistant Chat`), tap the input box, and verify that the input rises cleanly above the keyboard without obscuring existing messages.
3. **Camera Controls:** Navigate to the camera capture view; verify that the shutter button remains at the bottom of the screen regardless of device aspect ratio.
4. **Scrolling in Sheet:** Open the OCR verification view and scroll to the very bottom; verify that all editable input cards and the "Confirm & Save" button can be scrolled completely clear of the screen edges.
5. **Interactive Allergies:** Navigate to Records $\rightarrow$ Health Profile, tap `+ Add Allergy`, enter a dummy allergen, save, and confirm that the new allergy pill renders immediately in the profile grid.
6. **Relocated Consent:** Verify that the "Doctor Access Requests" card has been removed from Records and is functioning under Settings.
7. **Swipe Back:** On iOS or Android, enter a session detail view (`app/sessions/[id].tsx`) and swipe from the left edge of the screen to pop back to the Records list.