# SehatKosh OCR Plugins

This directory is the **plugin drop-in zone** for custom OCR adapters.

## How to Add a New OCR Model

1. **Create a new Python file** in this directory, e.g. `gemini_vision.py`

2. **Implement the `OCRProcessor` protocol**:

```python
# plugins/gemini_vision.py

class GeminiOCRAdapter:
    """Gemini Vision API OCR adapter for SehatKosh."""

    def __init__(self):
        import os
        self.api_key = os.getenv("VLM_API_KEY", "")

    async def extract_prescription(self, image_bytes: bytes) -> dict:
        # Your model inference / API call here
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        # ... implement and return dict matching OCRProcessor protocol
        raise NotImplementedError("Implement your model logic here.")
```

3. **Set the environment variable** in `services/backend/.env`:

```env
OCR_ENGINE=plugin:plugins.gemini_vision.GeminiOCRAdapter
```

4. **Restart the backend** — the registry will dynamically import your class.

## Safety Guarantee

If your plugin fails to import or does not satisfy the `OCRProcessor` protocol,
the backend **automatically falls back to `MockOCRAdapter`** and logs a warning.
The server will never crash due to a broken plugin.

## Requirements

- The plugin class must be importable from this directory (i.e., this directory
  must be on the Python path — the backend's working directory includes `services/backend/`).
- The class must implement:
  ```python
  async def extract_prescription(self, image_bytes: bytes) -> dict:
  ```
- The returned dict must include: `doctor_name`, `clinic`, `date`, `medications`, `raw_text`.
