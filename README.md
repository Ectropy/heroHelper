# heroHelper

A web tool for generating hero image and hero video HTML. Designed for non-technical folks who need a ready-made snippet they can paste.

## What it does

### Hero Image

1. **Image source** — choose a file on your PC or enter a URL
2. **Alt text** — required for accessibility
3. **Focal point** — click the image preview to set `object-position` so the subject stays visible on all screen sizes; simulate different viewport widths (4K → Tablet → Mobile) to verify the crop
4. **Hero height** — choose Short / Standard / Tall / Extra Tall, or set a fully custom `clamp()` value; taller containers show more of a tall subject
5. **Copy HTML** — one snippet with `<style>` + markup, ready to paste

### Hero Video

1. **DVIDS source** — paste a DVIDS iframe embed, a `dvidshub.net` URL, or a bare video ID; the m3u8 stream URL is derived for you
2. **Closed captions** — point at a VTT file already hosted in your DNN site
3. **Poster image** — point at a poster image already hosted in your DNN site
4. **Options** — pick the HLS.js source (DNN-bundled by default, or public CDN) and toggle whether the snippet should pull Font Awesome from the CDN
5. **Copy HTML** — full self-contained snippet (CSS + markup + player JS), ready to paste

## Development

```bash
npm install
npm run dev      # localhost:5173
npm run build    # production build → dist/
npm run preview  # serve dist/ locally
```

## Deploy

A GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) builds and publishes to GitHub Pages whenever you push a tag matching `v*` (e.g. `npm version patch && git push --follow-tags`). `vite.config.ts` sets `base: '/heroHelper/'`.

### Deploying from a fork

GitHub locks down Actions and Pages on freshly forked repos, so a tag push won't deploy until you opt in. One-time setup on your fork:

- **Enable workflows on the fork.** Visit `https://github.com/<you>/heroHelper/actions` — if you see a yellow *"Workflows aren't being run on this forked repository"* banner, click **I understand my workflows, go ahead and enable them**. Without this, no workflow runs are registered, even on a valid tag push.
- **Set Pages source to GitHub Actions.** Settings → Pages → Source → **GitHub Actions** (not "Deploy from a branch"). The workflow uses `actions/deploy-pages`, which requires this source.
- **Allow `main` and `v*` tags in the `github-pages` environment.** Settings → Environments → `github-pages` → Deployment branches and tags → add `main` (branch) and `v*` (tag). Without these, the deploy job is gated and silently skipped.

Once those are set, push a `v*` tag and the workflow will build and deploy. If you'd previously pushed a tag while deploys were disabled, re-trigger it with:

```bash
git push origin :refs/tags/v1.3.0   # delete the remote tag
git push origin v1.3.0              # re-push to fire the workflow
```
