# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Serve the dist/ build locally
```

## Architecture

Single-page React app (`src/App.jsx`) — no routing, no state management library. All state lives in one `useState` object at the `App` root and is passed down as `{ state, setState }` props.

### App flow
5 sections in the left column, plus a live preview and HTML output panel:
1. **Image source** — PC file upload (with DNN server path field) or URL
2. **Alt text** — required-field validation
3. **Focal point** — click-to-set on a live image preview; yellow dashed overlay shows the hero crop region for the selected simulation width
4. **Options** — Hero height preset (Short / Standard / Tall / Extra Tall / Custom); Custom exposes editable `clamp(min, vw, max)` inputs
5. **HTML output** — displays and copies the generated snippet

### Key constants / helpers
- `HEIGHT_PRESETS` — array of `{ key, label, clamp, calcH }`. `calcH(vw)` mirrors the CSS `clamp()` for use in JS crop math.
- `resolveHeight(heightPreset, customMin, customVw, customMax)` — returns `{ clamp, calcH }` for both preset and custom modes. Used by `generateHtml`, `getCropOverlay`, and the preview aspect-ratio.
- `PRESETS` — simulation widths (4K → Tablet → Mobile). Mobile shows full image uncropped.

### Crop overlay math (`getCropOverlay`)
Uses CSS `object-position` semantics: `heroLeft = (1 - heroVisW) * (focalX / 100)`. The picker image is always centered at 50/50 (default object-position), so picker offsets use `0.5 - pickerVisW/2`. The overlay is positioned in picker-display-space by mapping the hero's image-space rect through the picker's visible image-space rect.

### Output format
`generateHtml()` produces an inline `style="object-position: X% Y%;"` on the `<img>` (never preset classes). The `height` property on `.hh-hero-container` uses a `clamp()` value from the active height preset. The output includes a self-contained `<style>` block + `<div>`/`<img>` markup for one-paste use in a DNN Text/HTML module.

### CSS class naming
`hh-` prefix (`hh-hero-container`, `hh-hero-image`) minimises collision with unknown DNN theme styles.

## Deploy
`vite.config.js` sets `base: '/heroHelper/'` for GitHub Pages. Build `dist/` and push to the `gh-pages` branch.
