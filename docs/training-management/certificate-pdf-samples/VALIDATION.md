# Certificate PDF scaling fix — validation

## Root cause

`RFC.CreateTrainingCertificatePdfCore` invoked wkhtmltopdf **without** `--disable-smart-shrinking`.

With smart shrinking enabled (wkhtmltopdf 0.12.x default), a full A4 HTML sheet (210×296 mm) is scaled to ~80% of the page:

| Mode | Content size (mm) | % of A4 page |
|------|-------------------|--------------|
| Old args (margins 0 only) | 167.9 × 236.7 | 80.0% × 79.7% |
| New args (+ disable-smart-shrinking, zoom 1, dpi 96) | 209.9 × 295.8 | 100.0% × 99.6% |

Paper size was already A4 in both cases. HTML direction only moved the origin; it did not fix scale.

## Effective converter settings (after fix)

```
--enable-local-file-access
--encoding utf-8
--print-media-type
-O Portrait
--page-size A4
--margin-top 0 --margin-bottom 0 --margin-left 0 --margin-right 0
--disable-smart-shrinking
--zoom 1
--dpi 96
--image-quality 100
```

## Samples generated

Directory: `docs/training-management/certificate-pdf-samples/`

- `pals-new.pdf` — date-only footer (PALS)
- `bls-new.pdf` — signature footer (BLS)
- `long-new.pdf` — long Hebrew name + long course title

Each has a matching `-old.pdf` for comparison and a `-new.png` preview.

## Validation (new PDFs)

- Exactly 1 page each
- Page ~210 × 297 mm
- Artwork fills the sheet (bottom ~1.2 mm from intentional 296 mm `.page` height)
- No large side/bottom blank strip (old right gap 42 mm / bottom 60 mm → new ~0 / 1.2 mm)
- Selectable text present (`has_text: true`)
- No second blank page

## Environment note

Verified locally with `wkhtmltopdf 0.12.6 (with patched qt)`. Production reports `wkhtmltopdf 0.12.6` / Qt 4.8.7; both enable smart shrinking by default and reproduced the same 80% scale with the old argument list. Deploy the RFC change to the PDF host (`srv-ipracticom`) and regenerate certificates (existing `FilePath` PDFs are cached and will stay old until cleared/regenerated).
