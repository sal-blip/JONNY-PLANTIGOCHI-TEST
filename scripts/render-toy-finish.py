"""Rebuild the toy's two transparent sprite sheets from its original moulding.

Artist tool only. Requires Inkscape and Pillow. The game ships the finished PNGs.
"""
import copy
from pathlib import Path
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from PIL import Image

ART = Path(__file__).resolve().parents[1] / "public" / "art"
SVG = "http://www.w3.org/2000/svg"
XLINK = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG)
ET.register_namespace("xlink", XLINK)


def rasterize(document, size, directory):
    source = directory / "part.svg"
    target = directory / "part.png"
    ET.ElementTree(document).write(source, encoding="utf-8")
    subprocess.run(["inkscape", str(source), "--export-area-page",
                    f"--export-filename={target}", f"--export-width={size[0] * 2}",
                    f"--export-height={size[1] * 2}"], check=True)
    with Image.open(target) as image:
        return image.convert("RGBA").resize(size, Image.Resampling.LANCZOS)


def material(image):
    # A gentle RGB565 ramp keeps the long jade gradients and silver glints legible.
    def ramp(steps):
        return [round(.35 * n + .65 * round(n * steps / 255) * 255 / steps)
                for n in range(256)]

    colors = image.convert("RGB").point(ramp(31) + ramp(63) + ramp(31)).convert("RGBA")
    colors.putalpha(image.getchannel("A"))
    return colors


def make_moulding(directory):
    original = ET.parse(ART / "device.svg").getroot()
    objects = {element.get("id"): element for element in original.iter() if element.get("id")}
    defs = original.find(f"{{{SVG}}}defs")
    atlas = Image.new("RGBA", (360, 744))
    # Full-size offsets and crops are shared with MaterialPart in DeviceShell.jsx.
    for name, box, size, origin in (
        ("case-surface", "0 0 600 565", (360, 339), (0, 0)),
        ("case-detail", "0 0 600 565", (360, 339), (0, 339)),
        ("silver-ring", "96 18 100 98", (65, 64), (0, 680)),
        ("chainLink", "-10 -20 20 40", (14, 28), (67, 681)),
        ("eyelet-pin", "200 137 18 14", (12, 10), (83, 682)),
    ):
        document = ET.Element(f"{{{SVG}}}svg", viewBox=box)
        document.append(copy.deepcopy(defs))
        if name == "chainLink":
            ET.SubElement(document, f"{{{SVG}}}use", {f"{{{XLINK}}}href": f"#{name}"})
        else:
            document.append(copy.deepcopy(objects[name]))
        atlas.paste(material(rasterize(document, size, directory)), origin)
    atlas.save(ART / "toy-moulding.png", optimize=True)


def make_keycaps(directory):
    symbols = (
        "M13.2 8.6H8.6l2.7-2.6 M8.7 8.6l2.7 2.6 M13.1 8.6q3.6 0 3.6 3.6v3.5",
        "M13.8 8.1l-3.9 3.9 3.9 3.9",
        "M12 16.6l-4.2-4.3c-3.1-3.3 1.5-6.1 4.2-2.7 2.6-3.4 7.3-.6 4.2 2.7z",
        "M10.2 8.1l3.9 3.9-3.9 3.9",
    )
    sheet = Image.new("RGBA", (96, 24))
    for i, symbol in enumerate(symbols):
        face = ET.fromstring(f'''<svg xmlns="{SVG}" viewBox="0 0 24 24">
          <defs><linearGradient id="sage" x1=".16" y1="0" x2=".78" y2=".97">
            <stop stop-color="#e6eece"/><stop offset=".54" stop-color="#c6d9ac"/>
            <stop offset="1" stop-color="#9ab987"/></linearGradient></defs>
          <circle cx="12" cy="12.5" r="10.9" fill="#72936c" stroke="#617f58" stroke-width=".75"/>
          <circle cx="11.8" cy="11.4" r="10.4" fill="url(#sage)" stroke="#a9c294" stroke-width=".8"/>
          <path d="M2.8 9.6a9.2 9.2 0 0 1 11.5-7.3" fill="none" stroke="#eef5d6" stroke-width="1.2" stroke-linecap="round"/>
          <g fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="{symbol}" stroke="#e3eac6" transform="translate(0 .8)"/>
            <path d="{symbol}" stroke="#4c6a47"/></g></svg>''')
        sheet.paste(material(rasterize(face, (24, 24), directory)), (i * 24, 0))
    sheet.save(ART / "toy-keycaps.png", optimize=True)


if __name__ == "__main__":
    with tempfile.TemporaryDirectory() as tmp:
        make_moulding(Path(tmp))
        make_keycaps(Path(tmp))
