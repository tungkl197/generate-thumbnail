import os
import base64
import mimetypes
import httpx
from fastapi import FastAPI, Form
from fastapi.responses import FileResponse, JSONResponse
from jinja2 import Environment, FileSystemLoader

from text_parser import parse_colored_text
from renderer import render_thumbnail

# ===== App Setup =====
app = FastAPI(
    title="Thumbnail Generator API",
    description="Generate thumbnail PNG from R2 image URL + styled text",
    version="1.1.0",
)

# ===== Template Setup =====
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

# ===== Pre-load background image as base64 =====
BACKGROUND_PATH = os.path.join(os.path.dirname(__file__), "background.png")


def file_to_base64_uri(file_path: str) -> str:
    """Convert a file to a base64 data URI."""
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = "image/png"
    with open(file_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    return f"data:{mime_type};base64,{data}"


def bytes_to_base64_uri(data: bytes, mime_type: str = "image/jpeg") -> str:
    """Convert raw bytes to a base64 data URI."""
    encoded = base64.b64encode(data).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


# Pre-load background
BACKGROUND_BASE64 = file_to_base64_uri(BACKGROUND_PATH)


@app.post("/api/generate-thumbnail")
async def generate_thumbnail(
    r2_url: str = Form(..., description="URL to girl image (e.g. R2 public URL)"),
    text: str = Form(
        ...,
        description='Text with color tags, e.g.: Tôi đòi <green>nghỉ việc</green>, sếp tổng liền <red>phát điên</red> rồi',
    ),
):
    """
    Generate a thumbnail PNG image.

    - **r2_url**: Public URL to the girl image (R2, S3, or any HTTP URL)
    - **text**: Text with color tags like <green>...</green>, <red>...</red>

    Returns: PNG image file (1920×1080)
    """
    try:
        # 1. Download girl image from R2 URL → base64 data URI
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(r2_url)
            response.raise_for_status()

        girl_bytes = response.content
        girl_mime = response.headers.get("content-type", "image/jpeg")
        girl_base64 = bytes_to_base64_uri(girl_bytes, girl_mime)

        # 2. Parse colored text
        text_html = parse_colored_text(text)

        # 3. Render HTML template with Jinja2
        template = jinja_env.get_template("index.html")
        html_content = template.render(
            girl_image=girl_base64,
            background_image=BACKGROUND_BASE64,
            text_html=text_html,
        )

        # 4. Screenshot with Playwright → PNG
        output_path = await render_thumbnail(html_content)

        # 5. Return PNG file
        return FileResponse(
            path=output_path,
            media_type="image/png",
            filename="thumbnail.png",
        )

    except httpx.HTTPStatusError as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Failed to download image from R2: {e.response.status_code}"},
        )
    except httpx.RequestError as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Failed to connect to R2 URL: {str(e)}"},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )


@app.get("/")
async def root():
    return {
        "message": "Thumbnail Generator API",
        "usage": "POST /api/generate-thumbnail with r2_url (string) and text (string)",
        "text_format": "Use <green>...</green>, <red>...</red> for colored text",
    }
