from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1] / "qa"
for folder in ("qa_postcopy_guide_final",):
    src = root / folder
    pages = sorted(src.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
    for group_idx in range(0, len(pages), 4):
        group = pages[group_idx:group_idx + 4]
        opened = [Image.open(p).convert("RGB") for p in group]
        w = max(im.width for im in opened)
        h = max(im.height for im in opened)
        sheet = Image.new("RGB", (w * 2 + 60, h * 2 + 90), "#D8D8D8")
        draw = ImageDraw.Draw(sheet)
        for i, (path, im) in enumerate(zip(group, opened)):
            x = 20 + (i % 2) * (w + 20)
            y = 35 + (i // 2) * (h + 20)
            sheet.paste(ImageOps.expand(im, border=1, fill="black"), (x, y))
            draw.text((x, 10 + (i // 2) * (h + 20)), f"Page {int(path.stem.split('-')[-1])}", fill="black")
        out = src / f"contact-{group_idx // 4 + 1:02d}.png"
        sheet.save(out)
        for im in opened:
            im.close()
        print(out)
