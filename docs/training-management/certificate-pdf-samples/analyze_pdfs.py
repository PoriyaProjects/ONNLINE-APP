import fitz
import os
import json

out = r"C:\Users\adahabre\ONNLINE-APP\docs\training-management\certificate-pdf-samples"
rows = []
for name in sorted(os.listdir(out)):
    if not name.endswith(".pdf"):
        continue
    path = os.path.join(out, name)
    doc = fitz.open(path)
    page = doc[0]
    rect = page.rect
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    w, h = pix.width, pix.height
    samples = pix.samples
    n = pix.n
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        row = y * w * n
        for x in range(w):
            i = row + x * n
            r, g, b = samples[i], samples[i + 1], samples[i + 2]
            if r < 250 or g < 250 or b < 250:
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
    scale = 2.0
    if maxx >= minx:
        cov = fitz.Rect(minx / scale, miny / scale, (maxx + 1) / scale, (maxy + 1) / scale)
    else:
        cov = fitz.Rect()
    cov_w_mm = cov.width * 25.4 / 72
    cov_h_mm = cov.height * 25.4 / 72
    page_w_mm = rect.width * 25.4 / 72
    page_h_mm = rect.height * 25.4 / 72
    rows.append(
        {
            "file": name,
            "pages": doc.page_count,
            "page_mm": [round(page_w_mm, 1), round(page_h_mm, 1)],
            "content_mm": [round(cov_w_mm, 1), round(cov_h_mm, 1)],
            "content_pct": [
                round(100 * cov_w_mm / page_w_mm, 1) if page_w_mm else 0,
                round(100 * cov_h_mm / page_h_mm, 1) if page_h_mm else 0,
            ],
            "left_gap_mm": round(cov.x0 * 25.4 / 72, 1),
            "top_gap_mm": round(cov.y0 * 25.4 / 72, 1),
            "right_gap_mm": round((rect.x1 - cov.x1) * 25.4 / 72, 1),
            "bottom_gap_mm": round((rect.y1 - cov.y1) * 25.4 / 72, 1),
            "has_text": bool(page.get_text("text").strip()),
        }
    )
    if name.endswith("-new.pdf"):
        page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(
            os.path.join(out, name.replace(".pdf", ".png"))
        )
    doc.close()

print(json.dumps(rows, indent=2, ensure_ascii=False))
old = next(r for r in rows if r["file"] == "pals-old.pdf")
new = next(r for r in rows if r["file"] == "pals-new.pdf")
print(
    "PALS content% W/H old->new:",
    old["content_pct"],
    "->",
    new["content_pct"],
)
print(
    "PALS content_mm old->new:",
    old["content_mm"],
    "->",
    new["content_mm"],
)
