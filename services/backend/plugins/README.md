# 🔌 SehatKosh Teammate Plugin Workspace

Welcome to the SehatKosh plugin workspace! This directory allows you to develop and test custom **OCR Engines** and **Smartwatch/Telemetry Parsers** without modifying core backend application logic.

---

## 📁 Directory Structure

```text
services/backend/plugins/
├── README.md             # This guide
├── ocr/
│   └── template.py       # Starter template for custom OCR / VLM models
└── telemetry/
    └── template.py       # Starter template for smartwatch & BLE data
```

---

## 🚀 Quickstart: Adding a Custom Plugin (3 Steps)

### Step 1: Duplicate a Template
* **For OCR / Prescription AI**: Copy `plugins/ocr/template.py` to `plugins/ocr/my_model.py`.
* **For Telemetry / Wearable Vitals**: Copy `plugins/telemetry/template.py` to `plugins/telemetry/my_band.py`.

---

### Step 2: Implement Your Logic
Ensure your adapter class satisfies the required protocol interface:

#### OCR Adapter Interface (`plugins.ocr.my_model.CustomOCRAdapter`)
```python
class CustomOCRAdapter:
    def __init__(self):
        # Load model weights, set API clients, etc.
        pass

    async def extract_prescription(self, image_bytes: bytes) -> dict:
        # Return structured extraction dict
        return {
            "doctor_name": "Dr. Example",
            "clinic": "Example Clinic",
            "date": "2026-10-04",
            "medications": [
                {
                    "name": "Amoxicillin",
                    "strength": "500mg",
                    "frequency": "TDS",
                    "duration": "7 days",
                    "snomed_code": "376255008"
                }
            ],
            "raw_text": "Extracted raw text..."
        }
```

#### Telemetry Adapter Interface (`plugins.telemetry.my_band.BandAdapter`)
```python
class BandAdapter:
    async def parse_wearable_payload(self, raw_data: dict) -> dict:
        return {
            "heart_rate": raw_data.get("bpm", 72),
            "spo2": raw_data.get("oxygen", 98),
            "steps": raw_data.get("step_count", 5000),
            "sleep_minutes": raw_data.get("sleep_duration", 420),
            "device_brand": "Fitbit / Apple / Custom BLE"
        }
```

---

### Step 3: Activate in `.env`
In `services/backend/.env`, set the corresponding environment variable to point to your dotted module and class name:

```env
# Activate custom OCR plugin:
OCR_ENGINE=plugin:plugins.ocr.my_model.CustomOCRAdapter

# Activate custom Telemetry plugin:
TELEMETRY_ENGINE=plugin:plugins.telemetry.my_band.BandAdapter
```

Restart your backend server (`make dev` or `make backend`). If your plugin encounters an import error or fails protocol validation, the backend **will automatically fall back to the Mock adapter with a safety log**, ensuring zero server crashes.
