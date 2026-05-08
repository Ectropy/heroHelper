// Pure helpers driving heroHelper's input → output contract.
// Kept free of React/DOM so they can be unit-tested with literal numbers.

export type HeightPresetKey = 'short' | 'standard' | 'tall' | 'extra-tall' | 'custom'
export type SimPresetKey = '2160p' | '1440p' | '1080p' | '720p' | 'tablet' | 'mobile'

export interface HeightPreset {
  key: HeightPresetKey
  label: string
  clamp?: string
  calcH?: (vw: number) => number
}

export interface SimPreset {
  key: SimPresetKey
  label: string
  width: number | null
}

export interface ResolvedHeight {
  clamp: string
  calcH: (vw: number) => number
}

export interface CropOverlay {
  left: number
  top: number
  width: number
  height: number
}

export interface GenerateHtmlInput {
  src: string
  alt: string
  focalX: number
  focalY: number
  heightPreset: HeightPresetKey
  customMin: number
  customVw: number
  customMax: number
}

export interface ComputeCropOverlayInput {
  imgNatural: { w: number; h: number }
  pickerW: number
  pickerH: number
  simWidth: number | null
  heroHeight: number
  focalX: number
  focalY: number
}

export const HEIGHT_PRESETS: HeightPreset[] = [
  { key: 'short',      label: 'Short',       clamp: 'clamp(220px, 13vw, 440px)',  calcH: vw => Math.min(Math.max(220, vw * 0.13), 440) },
  { key: 'standard',   label: 'Standard',    clamp: 'clamp(350px, 21vw, 700px)',  calcH: vw => Math.min(Math.max(350, vw * 0.21), 700) },
  { key: 'tall',       label: 'Tall',        clamp: 'clamp(450px, 28vw, 850px)',  calcH: vw => Math.min(Math.max(450, vw * 0.28), 850) },
  { key: 'extra-tall', label: 'Extra Tall',  clamp: 'clamp(600px, 38vw, 1100px)', calcH: vw => Math.min(Math.max(600, vw * 0.38), 1100) },
  { key: 'custom',     label: 'Custom' },
]

export const PRESETS: SimPreset[] = [
  { key: '2160p', label: '2160p (4K UHD)', width: 3840 },
  { key: '1440p', label: '1440p (2K QHD)', width: 2560 },
  { key: '1080p', label: '1080p (Full HD)', width: 1920 },
  { key: '720p',  label: '720p (HD)',       width: 1280 },
  { key: 'tablet', label: 'Tablet (540p)',   width: 960  },
  { key: 'mobile', label: 'Mobile', width: null },
]

export function resolveHeight(heightPreset: HeightPresetKey, customMin: number, customVw: number, customMax: number): ResolvedHeight {
  if (heightPreset === 'custom') {
    const mn = customMin, mx = customMax, v = customVw / 100
    return {
      clamp: `clamp(${mn}px, ${customVw}vw, ${mx}px)`,
      calcH: vw => Math.min(Math.max(mn, vw * v), mx),
    }
  }
  const preset = HEIGHT_PRESETS.find(h => h.key === heightPreset) ?? HEIGHT_PRESETS[1]
  return { clamp: preset.clamp!, calcH: preset.calcH! }
}

// Returns the input unchanged if it is a safe image URL (http(s) absolute, or
// root-relative path like "/Portals/0/Images/foo.jpg"); otherwise returns ''.
export function safeImageUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    try {
      const FAKE_BASE = 'https://h.invalid'
      const u = new URL(trimmed, FAKE_BASE)
      if (u.origin === FAKE_BASE) return u.href.slice(FAKE_BASE.length)
    } catch { /* fall through */ }
    return ''
  }
  try {
    const u = new URL(trimmed)
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'blob:') return u.href
  } catch { /* not a parseable URL */ }
  return ''
}

export function generateHtml({ src, alt, focalX, focalY, heightPreset, customMin, customVw, customMax }: GenerateHtmlInput): string {
  const x = Math.round(focalX)
  const y = Math.round(focalY)
  const hp = resolveHeight(heightPreset, customMin, customVw, customMax)

  return `<style>
  .heroHelper-hero-container {
    width: 100%;
    height: ${hp.clamp};
    overflow: hidden;
    line-height: 0;
  }
  .heroHelper-hero-container .heroHelper-hero-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  @media (max-width: 767.98px) {
    .heroHelper-hero-container {
      height: auto;
    }
    .heroHelper-hero-container .heroHelper-hero-image {
      object-fit: contain;
      height: auto;
    }
  }
</style>

<div class="heroHelper-hero-container">
  <img
    class="heroHelper-hero-image"
    style="object-position: ${x}% ${y}%;"
    src="${src}"
    alt="${alt}"
  >
</div>`
}

// Crop overlay math (extracted from App). Returns % coords (relative to the
// picker display area) for the dashed crop rectangle, or null when no crop
// applies (mobile, missing image dimensions, or zero-sized picker).
//
// Geometry: the hero region in image-space is the visible slice of an
// object-fit: cover render at (simWidth × heroHeight) with object-position
// (focalX%, focalY%). The picker shows a centered object-fit: cover render of
// the same image. We compute both rects in image-space (0..1), then map the
// hero rect into the picker's display space.
export function computeCropOverlay({
  imgNatural,
  pickerW,
  pickerH,
  simWidth,
  heroHeight,
  focalX,
  focalY,
}: ComputeCropOverlayInput): CropOverlay | null {
  if (simWidth === null) return null
  if (!imgNatural.w || !imgNatural.h) return null
  if (!pickerW || !pickerH) return null

  const heroScale = Math.max(simWidth / imgNatural.w, heroHeight / imgNatural.h)
  const heroVisW = simWidth / (heroScale * imgNatural.w)
  const heroVisH = heroHeight / (heroScale * imgNatural.h)
  const heroLeft = (1 - heroVisW) * (focalX / 100)
  const heroTop  = (1 - heroVisH) * (focalY / 100)

  const pickerScale = Math.max(pickerW / imgNatural.w, pickerH / imgNatural.h)
  const pickerVisW  = pickerW / (pickerScale * imgNatural.w)
  const pickerVisH  = pickerH / (pickerScale * imgNatural.h)
  const pickerLeft  = 0.5 - pickerVisW / 2
  const pickerTop   = 0.5 - pickerVisH / 2

  return {
    left:   (heroLeft - pickerLeft) / pickerVisW * 100,
    top:    (heroTop  - pickerTop)  / pickerVisH * 100,
    width:  heroVisW / pickerVisW * 100,
    height: heroVisH / pickerVisH * 100,
  }
}
