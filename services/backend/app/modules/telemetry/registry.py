import logging
import importlib

from app.modules.telemetry.interface import TelemetryProcessor
from app.modules.telemetry.adapters import MockTelemetryAdapter, PluginTelemetryAdapter

logger = logging.getLogger(__name__)


def _load_plugin(dotpath: str) -> TelemetryProcessor:
    """
    Dynamically load a telemetry plugin class by dotted module path.
    Example: plugins.telemetry.my_band.BandAdapter
    """
    try:
        module_path, class_name = dotpath.rsplit(".", 1)
        module = importlib.import_module(module_path)
        cls = getattr(module, class_name)
        instance = cls()

        if not isinstance(instance, TelemetryProcessor):
            raise TypeError(
                f"{dotpath} does not satisfy TelemetryProcessor protocol. "
                "Ensure it implements async def parse_wearable_payload(self, raw_data: dict)."
            )

        logger.info("Telemetry plugin loaded successfully: %s", dotpath)
        return PluginTelemetryAdapter(plugin_instance=instance)

    except (ImportError, AttributeError, TypeError, Exception) as exc:
        logger.warning(
            "Failed to load Telemetry plugin '%s': %s. Falling back to MockTelemetryAdapter.",
            dotpath,
            exc,
        )
        return MockTelemetryAdapter()


def get_telemetry_adapter(telemetry_engine: str) -> TelemetryProcessor:
    """
    Factory function resolving TELEMETRY_ENGINE env value to a concrete adapter.
    """
    engine = telemetry_engine.strip().lower()

    if engine == "mock":
        logger.info("Telemetry engine: MockTelemetryAdapter (mock mode)")
        return MockTelemetryAdapter()

    if engine.startswith("plugin:"):
        dotpath = telemetry_engine[len("plugin:"):].strip()
        if not dotpath:
            logger.warning("TELEMETRY_ENGINE='plugin:' but no dotpath provided. Falling back to mock.")
            return MockTelemetryAdapter()
        return _load_plugin(dotpath)

    logger.warning("Unknown TELEMETRY_ENGINE value '%s'. Falling back to MockTelemetryAdapter.", telemetry_engine)
    return MockTelemetryAdapter()
