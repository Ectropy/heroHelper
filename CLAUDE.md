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
4 sequential steps, each a self-contained component:
1. **Step1** — Image source: PC file upload (with DNN server path field) or URL
2. **Step2** — Alt text with required-field validation
3. **Step3** — Click-to-set focal point on a live image preview
4. **Step4** — Displays and copies the generated HTML

### Output format
`generateHtml()` always produces an inline `style="object-position: X% Y%;"` (never preset classes). The output includes a self-contained `<style>` block + the `<div>`/`<img>` markup so users paste one snippet into a DNN Text/HTML module.

### CSS class naming
`hh-` prefix (`hh-hero-container`, `hh-hero-image`) minimises collision with unknown DNN theme styles.

## Deploy
`vite.config.js` sets `base: '/heroHelper/'` for GitHub Pages. Build `dist/` and push to the `gh-pages` branch.
