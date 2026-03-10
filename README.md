# heroHelper

A web tool for generating hero image HTML. Designed for non-technical folks who need a ready-made snippet they can paste.

**Live:** https://ectropy.github.io/heroHelper/

## What it does

1. **Image source** — choose a file on your PC or enter a URL
2. **Alt text** — required for accessibility
3. **Focal point** — click the image preview to set `object-position` so the subject stays visible on all screen sizes
4. **Copy HTML** — one snippet with `<style>` + markup, ready to paste

## Development

```bash
npm install
npm run dev      # localhost:5173
npm run build    # production build → dist/
npm run preview  # serve dist/ locally
```

## Deploy

Build and push `dist/` to the `gh-pages` branch. `vite.config.js` sets `base: '/heroHelper/'` for GitHub Pages.
