from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parents[1] / "images" / "p01-animal-edge-overlay-20260426.png"
OUT_DIR = ROOT / "assets" / "animals"

SPRITES = {
    "squirrel.png": (0, 65, 116, 166),
    "bird.png": (258, 64, 366, 162),
    "rabbit.png": (15, 330, 128, 456),
    "ducklings.png": (272, 330, 385, 447),
    "lamb.png": (18, 872, 129, 1000),
    "bluebird.png": (10, 1615, 114, 1725),
}


def trim_alpha(image: Image.Image, padding: int = 8) -> Image.Image:
    alpha = image.getchannel("A")
    box = alpha.getbbox()
    if box is None:
        return image
    left, top, right, bottom = box
    left = max(left - padding, 0)
    top = max(top - padding, 0)
    right = min(right + padding, image.width)
    bottom = min(bottom + padding, image.height)
    return image.crop((left, top, right, bottom))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    for name, box in SPRITES.items():
        sprite = source.crop(box)
        trim_alpha(sprite).save(OUT_DIR / name)
    print(f"Prepared {len(SPRITES)} sprites in {OUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
