import re
from typing import Dict

# Mapping color tag → CSS class
COLOR_MAP: Dict[str, str] = {
    "green": "green-text",
    "red": "red-text",
    "blue": "blue-text",
    "yellow": "yellow-text",
    "white": "white-text",
}


def parse_colored_text(text: str) -> str:
    """
    Parse color tags in text and convert to HTML spans.

    Input:  Tôi đòi <green>nghỉ việc</green>, sếp tổng liền <red>phát điên</red> rồi
    Output: Tôi đòi <span class="green-text">nghỉ việc</span>, sếp tổng liền <span class="red-text">phát điên</span> rồi
    """
    for tag, css_class in COLOR_MAP.items():
        pattern = rf"<{tag}>(.*?)</{tag}>"
        replacement = rf'<span class="{css_class}">\1</span>'
        text = re.sub(pattern, replacement, text, flags=re.DOTALL)
    return text
