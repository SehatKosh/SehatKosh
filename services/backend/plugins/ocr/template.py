"""
OCR Teammate Instructions:
1. Duplicate this file, rename it (e.g., gemini_vlm.py or custom_yolo.py).
2. Implement the `extract_prescription` method.
3. In services/backend/.env, set:
   OCR_ENGINE=plugin:plugins.ocr.gemini_vlm.CustomOCRAdapter
"""


class CustomOCRAdapter:
    def __init__(self):
        # Initialize your model, API keys, or torch weights here
        pass

    async def extract_prescription(self, image_bytes: bytes) -> dict:
        # Process the image bytes with your model/API
        # Must return this dictionary structure:
        return {
            "doctor_name": "Extracted Doctor",
            "clinic": "Extracted Hospital",
            "date": "2026-10-04",
            "medications": [
                {
                    "name": "Drug Name",
                    "strength": "500mg",
                    "frequency": "Twice daily",
                    "duration": "5 days",
                    "snomed_code": "optional_snomed_code",
                }
            ],
            "raw_text": "Complete transcribed prescription text",
        }
