import templateHtml from '../templates/heroVideo.html?raw'
import { HELPER_URL } from './config'

export type HlsSource = 'dnn' | 'cdn'

export const DNN_HLS_SCRIPT_SRC = '/desktopmodules/sharedlibrary/validatedplugins/hls.js/hls.min.js'
export const CDN_HLS_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js'
export const CDN_FONT_AWESOME_HREF = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'

export interface ParsedDvids {
  videoId: string
  m3u8Url: string
}

export interface GenerateVideoHtmlInput {
  m3u8Url: string
  captionSrc: string
  posterUrl: string
  hlsSource: HlsSource
  includeFontAwesomeCdn: boolean
}

// Accepts a DVIDS iframe embed snippet, a dvidshub.net URL (embed or watch),
// or a bare numeric video ID. Returns null when no ID can be extracted.
export function parseDvidsInput(raw: string): ParsedDvids | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let candidate = trimmed
  const iframeSrc = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i)
  if (iframeSrc) candidate = iframeSrc[1]

  const urlMatch = candidate.match(/dvidshub\.net\/video(?:\/embed)?\/(\d+)/i)
  if (urlMatch) return buildParsed(urlMatch[1])

  const idMatch = candidate.match(/^\d+$/)
  if (idMatch) return buildParsed(idMatch[0])

  return null
}

function buildParsed(videoId: string): ParsedDvids {
  return { videoId, m3u8Url: `https://www.dvidshub.net/video/${videoId}.m3u8` }
}

// JS line terminators U+2028 / U+2029 must be escaped inside string literals.
// Built via new RegExp() so the source is parseable (a literal /<U+2028>/ is
// rejected by TS — those code points end the regex literal, like a newline).
const LS_RE = new RegExp(' ', 'g')
const PS_RE = new RegExp(' ', 'g')

// Escape a value so it can be safely inserted between double quotes in a JS
// string literal. Prevents user input from breaking out of `var x = "..."`.
function escapeForJsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(LS_RE, '\\u2028')
    .replace(PS_RE, '\\u2029')
}

function replaceAllToken(input: string, token: string, replacement: string): string {
  return input.split(token).join(replacement)
}

export function generateVideoHtml({ m3u8Url, captionSrc, posterUrl, hlsSource, includeFontAwesomeCdn }: GenerateVideoHtmlInput): string {
  const hlsScriptSrc = hlsSource === 'cdn' ? CDN_HLS_SCRIPT_SRC : DNN_HLS_SCRIPT_SRC
  let out = templateHtml
  out = replaceAllToken(out, '__M3U8_URL__', escapeForJsString(m3u8Url))
  out = replaceAllToken(out, '__CAPTION_SRC__', escapeForJsString(captionSrc))
  out = replaceAllToken(out, '__POSTER_URL__', escapeForJsString(posterUrl))
  out = replaceAllToken(out, '__HLS_SCRIPT_SRC__', escapeForJsString(hlsScriptSrc))
  out = replaceAllToken(out, '__APP_VERSION__', __APP_VERSION__)
  out = replaceAllToken(out, '__HELPER_URL__', HELPER_URL)
  if (includeFontAwesomeCdn) {
    out = `<link rel="stylesheet" href="${CDN_FONT_AWESOME_HREF}">\n` + out
  }
  return out
}

// In-browser preview always forces both CDN sources regardless of user toggles:
//   - HLS.js: DNN's bundled copy resolves to 404 outside DNN.
//   - Font Awesome: heroHelper itself doesn't bundle it, so the player's
//     control icons would render empty without an injected stylesheet.
// The user-visible *output* still honours both toggles independently.
export function generateVideoPreviewHtml(opts: Omit<GenerateVideoHtmlInput, 'hlsSource' | 'includeFontAwesomeCdn'>): string {
  return generateVideoHtml({ ...opts, hlsSource: 'cdn', includeFontAwesomeCdn: true })
}
