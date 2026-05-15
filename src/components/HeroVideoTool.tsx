import { useState, useMemo } from 'react'
import {
  parseDvidsInput,
  generateVideoHtml,
  generateVideoPreviewHtml,
  type HlsSource,
} from '../lib/heroVideo'
import { SectionLabel } from './SectionLabel'

const CAPTION_STORAGE_KEY = 'heroHelper-video-caption-folder'
const POSTER_STORAGE_KEY = 'heroHelper-video-poster-folder'

interface VideoState {
  dvidsInput: string
  captionSrc: string
  posterUrl: string
  hlsSource: HlsSource
  includeFontAwesomeCdn: boolean
}

// Allow path-style chars including DNN versioning query strings (?ver=...).
const DNN_PATH_PATTERN = /[^a-zA-Z0-9/_\-. ?=&%]/g

function sanitizeDnnPath(val: string): string {
  return val.replace(DNN_PATH_PATTERN, '')
}

export function HeroVideoTool() {
  const [state, setState] = useState<VideoState>({
    dvidsInput: '',
    captionSrc: localStorage.getItem(CAPTION_STORAGE_KEY) ?? '',
    posterUrl: localStorage.getItem(POSTER_STORAGE_KEY) ?? '',
    hlsSource: 'dnn',
    includeFontAwesomeCdn: false,
  })
  const [captionWarned, setCaptionWarned] = useState(false)
  const [posterWarned, setPosterWarned] = useState(false)
  const [copied, setCopied] = useState(false)

  const { dvidsInput, captionSrc, posterUrl, hlsSource, includeFontAwesomeCdn } = state

  const parsed = useMemo(() => parseDvidsInput(dvidsInput), [dvidsInput])
  const dvidsAttempted = dvidsInput.trim() !== ''
  const hasDvids = parsed !== null
  const hasCaption = captionSrc.trim() !== ''
  const hasPoster = posterUrl.trim() !== ''
  const isComplete = hasDvids && hasCaption && hasPoster

  // Preview becomes available as soon as the DVIDS source parses successfully.
  // Captions/poster are passed through even when empty so the user can preview
  // as they go; the HTML output panel still requires all three.
  const previewHtml = useMemo(() => {
    if (!parsed) return ''
    return generateVideoPreviewHtml({
      m3u8Url: parsed.m3u8Url,
      captionSrc,
      posterUrl,
    })
  }, [parsed, captionSrc, posterUrl])

  const html = useMemo(() => {
    if (!isComplete || !parsed) return ''
    return generateVideoHtml({
      m3u8Url: parsed.m3u8Url,
      captionSrc,
      posterUrl,
      hlsSource,
      includeFontAwesomeCdn,
    })
  }, [isComplete, parsed, captionSrc, posterUrl, hlsSource, includeFontAwesomeCdn])

  const handleCaption = (val: string) => {
    const clean = sanitizeDnnPath(val)
    localStorage.setItem(CAPTION_STORAGE_KEY, clean)
    setState(s => ({ ...s, captionSrc: clean }))
    if (clean.trim()) setCaptionWarned(false)
  }

  const handlePoster = (val: string) => {
    const clean = sanitizeDnnPath(val)
    localStorage.setItem(POSTER_STORAGE_KEY, clean)
    setState(s => ({ ...s, posterUrl: clean }))
    if (clean.trim()) setPosterWarned(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleReset = () => {
    setState({
      dvidsInput: '',
      captionSrc: localStorage.getItem(CAPTION_STORAGE_KEY) ?? '',
      posterUrl: localStorage.getItem(POSTER_STORAGE_KEY) ?? '',
      hlsSource: 'dnn',
      includeFontAwesomeCdn: false,
    })
    setCaptionWarned(false)
    setPosterWarned(false)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">

      {/* ── LEFT: Inputs ── */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">

        {/* Section 1: DVIDS source */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={1} title="DVIDS source" done={hasDvids} />
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Paste DVIDS embed code, URL, or video ID <span className="text-red-500">*</span>
          </label>
          <textarea
            value={dvidsInput}
            onChange={e => setState(s => ({ ...s, dvidsInput: e.target.value }))}
            rows={3}
            placeholder={'<iframe src="https://www.dvidshub.net/video/embed/996624" ...>'}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          {parsed ? (
            <div className="mt-2 px-2 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs">
              <p className="text-green-700">Found DVIDS video <span className="font-mono font-semibold">{parsed.videoId}</span>.</p>
              <p className="mt-0.5 text-green-600 font-mono break-all">→ {parsed.m3u8Url}</p>
            </div>
          ) : dvidsAttempted ? (
            <p className="mt-1 text-xs text-red-500 font-medium">Could not find a DVIDS video ID in that input.</p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">
              Accepts the full <code>{'<iframe>'}</code> embed code, a dvidshub.net URL, or a bare video ID.
            </p>
          )}
        </div>

        {/* Section 2: Closed captions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={2} title="Closed captions" done={hasCaption} />
          <label className="block text-xs font-medium text-gray-700 mb-1">
            VTT path on DNN <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={captionSrc}
            onChange={e => handleCaption(e.target.value)}
            onBlur={() => { if (!captionSrc.trim()) setCaptionWarned(true) }}
            placeholder="/Portals/0/Videos/captions.vtt"
            className={`w-full px-2 py-1.5 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500
              ${captionWarned ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          />
          {captionWarned && (
            <p className="mt-1 text-xs text-red-500 font-medium">Captions path is required.</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            DNN path to your uploaded <code>.vtt</code> file. Required for accessibility.
          </p>
        </div>

        {/* Section 3: Poster image */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={3} title="Poster image" done={hasPoster} />
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Poster path on DNN <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={posterUrl}
            onChange={e => handlePoster(e.target.value)}
            onBlur={() => { if (!posterUrl.trim()) setPosterWarned(true) }}
            placeholder="/Portals/0/Videos/poster.png"
            className={`w-full px-2 py-1.5 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500
              ${posterWarned ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          />
          {posterWarned && (
            <p className="mt-1 text-xs text-red-500 font-medium">Poster path is required.</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            DNN path to your poster image. Shown before play and after the final loop.
          </p>
        </div>

        {/* Section 4: Options */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-blue-600 text-white">
              4
            </div>
            <h2 className="text-base font-semibold text-gray-800">Options</h2>
          </div>

          <label className="text-xs font-medium text-gray-700 block mb-1.5">HLS.js source</label>
          <div className="flex gap-2">
            {([
              { id: 'dnn', label: 'DNN bundled' },
              { id: 'cdn', label: 'Public CDN' },
            ] as { id: HlsSource; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setState(s => ({ ...s, hlsSource: id }))}
                className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors
                  ${hlsSource === id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {hlsSource === 'dnn'
              ? <>Loads HLS.js from AFPIMS at <span className="font-mono break-all">/desktopmodules/sharedlibrary/validatedplugins/hls.js/hls.min.js</span>. Use on DNN sites that already include it.</>
              : <>Loads HLS.js from <span className="font-mono break-all">cdn.jsdelivr.net</span>. Use on sites where the DNN bundled copy is unavailable.</>}
          </p>

          <label className="text-xs font-medium text-gray-700 block mt-4 mb-1.5">Font Awesome icons</label>
          <div className="flex gap-2">
            {([
              { id: false, label: 'DNN bundled' },
              { id: true, label: 'Include CDN' },
            ] as { id: boolean; label: string }[]).map(({ id, label }) => (
              <button
                key={String(id)}
                onClick={() => setState(s => ({ ...s, includeFontAwesomeCdn: id }))}
                className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors
                  ${includeFontAwesomeCdn === id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {includeFontAwesomeCdn
              ? <>Adds a Font Awesome 6 stylesheet from <span className="font-mono break-all">cdnjs.cloudflare.com</span>. Use on sites that don't already include Font Awesome.</>
              : <>Relies on Font Awesome already being loaded by the host page (default on AFPIMS / DNN). The player's icons need <span className="font-mono">fa-solid fa-*</span> classes from Font Awesome 6.</>}
          </p>

          <p className="mt-3 text-[10px] text-gray-400 italic">
            The preview always loads HLS.js and Font Awesome from public CDNs since this tool isn't running inside DNN. The toggles only affect the generated code.
          </p>
        </div>

      </div>

      {/* ── RIGHT: preview + HTML ── */}
      <div className="w-full flex-1 min-w-0 flex flex-col xl:flex-row gap-4 items-start">

        {/* ── MIDDLE: Live preview ── */}
        <div className="w-full xl:flex-1 min-w-0">
          {parsed ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
              <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 flex items-center gap-3">
                <span className="text-xs text-gray-500 font-medium">Live preview</span>
                <span className="text-[10px] text-gray-400">16:9 — scaled to width</span>
              </div>
              <iframe
                key={previewHtml}
                srcDoc={previewHtml}
                className="block w-full bg-black"
                style={{ aspectRatio: '16 / 9', maxHeight: '70vh', border: 0 }}
                sandbox="allow-scripts allow-same-origin"
                title="Hero video live preview"
              />
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white flex items-center justify-center" style={{ height: '200px' }}>
              <p className="text-xs text-gray-400">Paste a DVIDS embed to see a live preview.</p>
            </div>
          )}
        </div>{/* ── END MIDDLE ── */}

        {/* ── RIGHT: HTML output ── */}
        <div className="w-full xl:w-96 shrink-0">
          <div className={`bg-white rounded-xl shadow-sm border p-4 transition-opacity
            ${isComplete ? 'border-gray-100 opacity-100' : 'border-gray-100 opacity-50 pointer-events-none'}`}>
            <SectionLabel number={5} title="Your HTML code" done={false} />

            {isComplete ? (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  Copy and paste into your DNN Text/HTML module.
                </p>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                    <span className="text-xs text-gray-400 font-medium">HTML</span>
                    <button
                      onClick={handleCopy}
                      className={`text-xs font-medium px-3 py-1 rounded-md transition-colors
                        ${copied ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                    >
                      {copied ? '✓ Copied!' : 'Copy to clipboard'}
                    </button>
                  </div>
                  <pre className="p-3 text-xs text-green-300 overflow-x-auto overflow-y-auto whitespace-pre font-mono leading-relaxed" style={{ maxHeight: '500px' }}>
                    {html}
                  </pre>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleReset}
                    className="px-4 py-1.5 bg-gray-800 text-white rounded-lg font-medium text-xs hover:bg-gray-700 transition-colors"
                  >
                    Start over
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400">
                Fill in the DVIDS source, captions path, and poster path to generate the code.
              </p>
            )}
          </div>
        </div>{/* ── END RIGHT ── */}

      </div>
    </div>
  )
}
