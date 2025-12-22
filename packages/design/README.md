# #play14 — Graphic Design Assets

This repository contains the graphic design resources for the https://play14.org website. Use this README to quickly find the correct asset for web, social, or print, and follow the guidance for export, licensing, and contribution.

## Overview

Purpose: central store of logos, color palettes, fonts and export-ready artwork for #play14.

Helpful notes:

- Keep production sites and marketing materials linked to this repo for a single source of truth.
- Before publishing or printing, verify font and artwork licenses (see Licensing section).

## Repository structure

- `colors/` — color palette assets and documentation (PNG swatches and `Colors.txt`/`Colors.docx`). Check `Colors.txt` for hex/RGB values.
- `font/` — fonts used by the brand
- `logo/` — master logo files in multiple formats and export folders:
  - `EPS/` — vector EPS files for print workflows
  - `PNG/` — raster images, multiple sizes (web/social)
  - `SVG/` — scalable vector files for modern web use
  - `PDF/` — print-ready PDFs
  - `PSD/` — layered Photoshop sources
  - `favicon/` — `favicon.ico` and `favicon.png`
  - `Export print.zip` — a zip with print export assets (check `logo/10 years/` for anniversary artwork)

Subfolders may contain high-resolution variants (e.g. `PNG/4800x1506/`). Prefer vector formats (`SVG`, `EPS`, `PDF`) for print and scalable web icons.

## Quick usage guidance

- Web (recommended): use `SVG` when possible for logos and icons; fall back to `PNG` for raster needs. Use the appropriately sized file from `PNG/` for social images to avoid client-side scaling.
- Print: use `EPS` or high-resolution `PDF` from the `logo/PDF` or `logo/EPS` folders. When exporting for print, supply CMYK color values from `colors/` if available.
- Social and banners: use `PNG/` sizes that match the target platform. Check the `PNG/4800x1506` and other size folders for ready-to-use assets.

### Example: embed SVG on the site

Place the chosen file from `logo/SVG/` in the web build and reference it in HTML/CSS so it scales crisply on all devices.

## Color palette

The `colors/` folder contains swatches and a `Colors.txt` or `colors/Colors.docx`  files with palette details. 

```
#D80000 #	Red
#FF5200 p	Orange
#FFC900 l	Yellow
#92C900 a	Green
#0098DD y	Blue
#393939 14	Gray
```

## Fonts

The fonts are organized in subfolders under `font/` (each folder contains the OTF file plus a small `readme.html` with source/license notes):

- `font/DIN Alternate Regular/DIN Alternate Regular.otf`
- `font/DIN Alternate Medium/DIN Alternate Medium.otf`
- `font/DIN Alternate Bold/DIN Alternate Bold.otf`

Before embedding fonts on the website or redistributing them, open the `readme.html` file in the same folder and confirm the license/EULA permits the intended use (web embedding, conversion, distribution). If webfont conversion is necessary, only convert/serve formats you have explicit rights for (WOFF/WOFF2 recommended for modern web).

Reference: font attribution is noted in the Licensing section (https://fontsgeek.com/din-alternate-font) — verify vendor terms there if in doubt.

## Logo and formats (recommendations)

- Use `SVG` for responsive sites and inline coloring (where allowed).
- Use `PNG` for raster-only contexts or when transparency is required and an SVG isn't supported.
- Use `EPS`/high-res `PDF` for print. Ensure files are CMYK if printing commercially.
- Use the `favicon/` icons for browser tabs; convert to multiple sizes if needed for Android/iOS (192×192, 32×32, 16×16).

### Export / unzip example

To inspect the print export zip on a system with bash (Windows WSL/ Git Bash):

```bash
# Extract the export zip in place
unzip "logo/Export print.zip" -d logo/exported-print

# List high-res PNGs
ls -lh "logo/PNG" | head -n 40
```

## File naming and contribution guidelines

- Keep file names descriptive and avoid spaces (use hyphens or underscores) when creating new exports for the website.
- When adding new assets, include a short text file beside them with: source author, date, intended use, and license.
- Do not overwrite existing EPS/SVG masters — add new versions (e.g. `logo-name_v2.eps`) and keep the old master for traceability.

## Licensing & attribution

- The brand #play14 and website http://play14.org belongs to

  ```
  #play14 a.s.b.l.
  46 boulevard Jules Salentiny
  L-2511 Luxembourg
  LUXEMBOUG
  ```

- Logo designed by Christian Jolas — https://www.linkedin.com/in/christianjolas
- Font attribution: https://fontsgeek.com/din-alternate-font

## Contact / owner

For questions about correct color values, font licenses, or which master to use, contact the site/brand owner for #play14. If you don't have a direct contact, add an issue or a small text file `OWNER.md` to this repo with contact info so teams know who to ask.
