import logging
import importlib

from app.modules.ocr.interface import OCRProcessor
from app.modules.ocr.adapters import MockOCRAdapter, PluginOCRAdapter

logger = logging.getLogger(__name__)


def _load_plugin(dotpath: str) -> OCRProcessor:
    """
    Dynamically import a plugin adapter class by its dotted module path.

    The dotpath format is:  module.submodule.ClassName
    Example: plugins.gemini_vision.GeminiOCRAdapter

    Adjustment #4 (mandatory): The entire import and protocol-validation
    is wrapped in try/except. If the import fails for any reason (missing
    module, missing class, wrong signature, etc.), we log a WARNING and
    fall back to MockOCRAdapter so the server never hard-crashes due to
    a broken or missing plugin.

    Args:
        dotpath: Fully-qualified Python dotted path to the adapter class.

    Returns:
        An instance satisfying OCRProcessor protocol, or MockOCRAdapter.
    """
    try:
        # Split into "module.path" and "ClassName"
        module_path, class_name = dotpath.rsplit(".", 1)
        module = importlib.import_module(module_path)
        cls = getattr(module, class_name)
        instance = cls()

        # Validate it actually satisfies the Protocol at runtime
        if not isinstance(instance, OCRProcessor):
            raise TypeError(
                f"{dotpath} does not satisfy the OCRProcessor protocol. "
                f"Ensure it implements async def extract_prescription(self, image_bytes: bytes) -> dict."
            )

        logger.info("OCR plugin loaded successfully: %s", dotpath)
        return PluginOCRAdapter(plugin_instance=instance)

    except (ImportError, AttributeError, TypeError, Exception) as exc:
        logger.warning(
            "Failed to load OCR plugin '%s': %s. "
            "Falling back to MockOCRAdapter.",
            dotpath,
            exc,
        )
        return MockOCRAdapter()


def get_ocr_adapter(ocr_engine: str) -> OCRProcessor:
    """
    Factory function: resolve OCR_ENGINE env value to a concrete adapter.

    Accepted values:
        "mock"               → MockOCRAdapter (default, always safe)
        "plugin:<dotpath>"   → dynamically load class at <dotpath>

    Args:
        ocr_engine: The value of the OCR_ENGINE environment variable.

    Returns:
        A concrete object satisfying OCRProcessor protocol.
    """
    engine = ocr_engine.strip().lower()

    if engine == "mock":
        logger.info("OCR engine: MockOCRAdapter (mock mode)")
        return MockOCRAdapter()

    if engine.startswith("plugin:"):
        dotpath = ocr_engine[len("plugin:"):].strip()
        if not dotpath:
            logger.warning(
                "OCR_ENGINE='plugin:' but no dotpath provided. Falling back to mock."
            )
            return MockOCRAdapter()
        return _load_plugin(dotpath)

    # Unknown value → warn + fall back to mock
    logger.warning(
        "Unknown OCR_ENGINE value '%s'. Falling back to MockOCRAdapter.",
        ocr_engine,
    )
    return MockOCRAdapter()
