import os
import uuid
from playwright.async_api import async_playwright

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


async def render_thumbnail(html_content: str, output_filename: str = None) -> str:
    """
    Render HTML content to a PNG screenshot using Playwright headless Chromium.

    Args:
        html_content: Full HTML string to render
        output_filename: Optional filename for the output PNG. If None, a UUID is generated.

    Returns:
        Absolute path to the generated PNG file.
    """
    if output_filename is None:
        output_filename = f"thumbnail_{uuid.uuid4().hex[:8]}.png"

    output_path = os.path.join(OUTPUT_DIR, output_filename)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={"width": 1920, "height": 1080},
        )

        # Load HTML content directly
        await page.set_content(html_content)

        # Wait for Google Fonts and all images to load
        await page.wait_for_load_state("networkidle")

        # Extra wait to ensure font rendering is complete
        await page.wait_for_timeout(1000)

        # Screenshot only the .thumbnail element
        thumbnail_element = await page.query_selector("#thumbnail")
        if thumbnail_element:
            await thumbnail_element.screenshot(path=output_path, type="png")
        else:
            # Fallback: screenshot the full page
            await page.screenshot(
                path=output_path,
                type="png",
                clip={"x": 0, "y": 0, "width": 1920, "height": 1080},
            )

        await browser.close()

    return output_path
