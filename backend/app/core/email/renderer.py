"""
Jinja2 rendering utility — pure rendering, zero business logic.

Architectural decision: Isolating template rendering here means:
  - Templates can be tested independently with mock contexts.
  - The Resend client never touches Jinja2 (SRP).
  - Changing template engines (e.g. to Mako) only impacts this file.
"""
import logging
from pathlib import Path
from typing import Any

from jinja2 import (
    Environment,
    FileSystemLoader,
    TemplateNotFound,
    select_autoescape,
    StrictUndefined,
)

from app.core.email.templates_enum import EmailTemplate

logger = logging.getLogger(__name__)

# Absolute path to the templates/emails/ directory.
# Resolved once at module load — cheap and deterministic.
_TEMPLATES_DIR = Path(__file__).resolve().parents[3] / "templates" / "emails"


def _get_jinja_env() -> Environment:
    """
    Build a Jinja2 Environment with security defaults.

    - FileSystemLoader: loads from disk (supports template inheritance).
    - select_autoescape: escapes HTML by default → prevents XSS in emails.
    - StrictUndefined: raises TemplateRuntimeError on missing variables
      instead of silently rendering empty strings.
    """
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )


# Single shared environment instance (thread-safe, Jinja2 is reentrant).
_jinja_env: Environment = _get_jinja_env()


def render_template(template: EmailTemplate, context: dict[str, Any]) -> str:
    """
    Render an email HTML template and return the final HTML string.

    Args:
        template: EmailTemplate enum member identifying the template file.
        context:  Variables injected into the Jinja2 context.

    Returns:
        Rendered HTML string ready to be sent.

    Raises:
        FileNotFoundError: If the template file does not exist on disk.
        jinja2.TemplateRuntimeError: If a required variable is missing.
    """
    template_file = f"{template.value}.html"
    try:
        tmpl = _jinja_env.get_template(template_file)
        rendered = tmpl.render(**context)
        logger.debug("Template '%s' rendered successfully.", template_file)
        return rendered
    except TemplateNotFound:
        logger.error("Template file not found: templates/emails/%s", template_file)
        raise FileNotFoundError(
            f"Email template '{template_file}' not found in {_TEMPLATES_DIR}"
        )
    except Exception as exc:
        logger.error("Template rendering error for '%s': %s", template_file, exc)
        raise
