import { useState, useRef, useCallback } from 'react'

// The CSS block that gets injected into the DNN HTML module alongside the markup.
// Uses hh- prefix to minimize collision with unknown DNN themes.
const HERO_STYLES = `<style>
  .hh-hero-container {
    width: 100%;
    height: 400px;
    overflow: hidden;
    line-height: 0;
  }
  .hh-hero-container .hh-hero-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  @media (max-width: 767.98px) {
    .hh-hero-container {
      height: auto;
    }
    .hh-hero-container .hh-hero-image {
      object-fit: contain;
      height: auto;
    }
  }
</style>`

const HERO_HEIGHT = 400 // px — must match the CSS above

const PRESETS = [
  { key: '2160p', label: '2160p (4K UHD)', width: 3840 },
  { key: '1440p', label: '1440p (2K QHD)', width: 2560 },
  { key: '1080p', label: '1080p (Full HD)', width: 1920 },
  { key: '720p',  label: '720p (HD)',       width: 1280 },
  { key: 'mobile', label: 'Mobile', width: null },
]

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

function generateHtml({ src, alt, focalX, focalY }) {
  const x = Math.round(focalX)
  const y = Math.round(focalY)
  return `${HERO_STYLES}

<div class="hh-hero-container">
  <img
    class="hh-hero-image"
    style="object-position: ${x}% ${y}%;"
    src="${src}"
    alt="${alt}"
  >
</div>`
}

const STORAGE_KEY = 'hh-dnn-path'

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ number, title, done }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
        ${done ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
        {done ? '✓' : number}
      </div>
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    </div>
  )
}

export default function App() {
  const fileRef = useRef(null)
  const pickerRef = useRef(null)

  const [state, setState] = useState({
    mode: 'pc',
    previewUrl: '',
    dnnPath: localStorage.getItem(STORAGE_KEY) || '',
    urlInput: '',
    src: '',
    alt: '',
    focalX: 50,
    focalY: 50,
    simPreset: '1080p',
    imgNatural: { w: 0, h: 0 },
  })
  const [altWarned, setAltWarned] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Derived values ──────────────────────────────────────────────────────────
  const { mode, previewUrl, dnnPath, urlInput, alt, focalX, focalY, simPreset, imgNatural } = state

  const lastSlash = dnnPath.lastIndexOf('/')
  const dnnFolder = lastSlash >= 0 ? dnnPath.slice(0, lastSlash + 1) : ''
  const dnnFilename = lastSlash >= 0 ? dnnPath.slice(lastSlash + 1) : dnnPath

  const srcForOutput = mode === 'url' ? urlInput : dnnPath
  const hasImage = mode === 'url' ? urlInput.trim() !== '' : (previewUrl !== '' && dnnPath.trim() !== '')
  const hasAlt = alt.trim() !== ''
  const isComplete = hasImage && hasAlt

  const html = isComplete ? generateHtml({ src: srcForOutput, alt, focalX, focalY }) : ''

  const currentPreset = PRESETS.find(p => p.key === simPreset) || PRESETS[2]
  const isMobile = simPreset === 'mobile'
  const showSizeWarning = !isMobile && imgNatural.w > 0 && currentPreset.width > imgNatural.w

  // ── Crop overlay math ────────────────────────────────────────────────────────
  // Returns % coords (relative to picker display area) for the dashed crop rectangle.
  function getCropOverlay() {
    if (isMobile || !imgNatural.w || !imgNatural.h || !pickerRef.current) return null
    const simWidth = currentPreset.width
    const pickerW = pickerRef.current.offsetWidth
    const pickerH = pickerRef.current.offsetHeight
    if (!pickerW || !pickerH) return null

    // Hero crop region in image-space (0..1)
    const heroScale = Math.max(simWidth / imgNatural.w, HERO_HEIGHT / imgNatural.h)
    const heroVisW = simWidth / (heroScale * imgNatural.w)
    const heroVisH = HERO_HEIGHT / (heroScale * imgNatural.h)
    const cx = clamp(focalX / 100, heroVisW / 2, 1 - heroVisW / 2)
    const cy = clamp(focalY / 100, heroVisH / 2, 1 - heroVisH / 2)
    const heroLeft = cx - heroVisW / 2
    const heroTop  = cy - heroVisH / 2

    // Picker's own visible region in image-space (object-cover, centered at 50/50)
    const pickerScale = Math.max(pickerW / imgNatural.w, pickerH / imgNatural.h)
    const pickerVisW  = pickerW / (pickerScale * imgNatural.w)
    const pickerVisH  = pickerH / (pickerScale * imgNatural.h)
    const pickerLeft  = 0.5 - pickerVisW / 2
    const pickerTop   = 0.5 - pickerVisH / 2

    // Map hero rect to picker display space (%)
    return {
      left:   (heroLeft - pickerLeft) / pickerVisW * 100,
      top:    (heroTop  - pickerTop)  / pickerVisH * 100,
      width:  heroVisW / pickerVisW * 100,
      height: heroVisH / pickerVisH * 100,
    }
  }

  const cropOverlay = previewUrl ? getCropOverlay() : null

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setState(s => {
      const ls = s.dnnPath.lastIndexOf('/')
      const folder = ls >= 0 ? s.dnnPath.slice(0, ls + 1) : ''
      const newPath = folder + file.name
      localStorage.setItem(STORAGE_KEY, newPath)
      return { ...s, previewUrl: objectUrl, dnnPath: newPath, imgNatural: { w: 0, h: 0 } }
    })
  }

  const handleDnnFolder = (val) => {
    const newPath = val + dnnFilename
    localStorage.setItem(STORAGE_KEY, newPath)
    setState(s => ({ ...s, dnnPath: newPath }))
  }

  const handleModeChange = (newMode) => {
    setState(s => ({ ...s, mode: newMode, previewUrl: '', urlInput: '', dnnPath: '', imgNatural: { w: 0, h: 0 } }))
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUrlInput = (val) => {
    setState(s => ({ ...s, urlInput: val, previewUrl: val, imgNatural: { w: 0, h: 0 } }))
  }

  const handleFocalClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setState(s => ({ ...s, focalX: Math.round(x), focalY: Math.round(y) }))
  }, [])

  const handleNaturalLoad = useCallback((e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target
    if (w && h) setState(s => ({ ...s, imgNatural: { w, h } }))
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleReset = () => {
    setState({
      mode: 'pc',
      previewUrl: '',
      dnnPath: localStorage.getItem(STORAGE_KEY) || '',
      urlInput: '',
      src: '',
      alt: '',
      focalX: 50,
      focalY: 50,
      simPreset: '1080p',
      imgNatural: { w: 0, h: 0 },
    })
    setAltWarned(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="w-full">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Hero Helper</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Quickly generate hero image HTML for any image.
          </p>
        </div>

        {/* Three-column layout: inputs | preview | html (xl+); two-column: inputs | preview+html (lg); stacked (below lg) */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ── LEFT: Inputs ── */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">

            {/* Section 1: Image source */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <SectionLabel number={1} title="Choose your image" done={hasImage} />

              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'pc', label: 'Upload from PC' },
                  { id: 'url', label: 'Use a URL' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleModeChange(id)}
                    className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors
                      ${mode === id
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* PC upload */}
              {mode === 'pc' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Choose an image file
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-gray-600
                        file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                        file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      File path on server
                    </label>
                    <div className="flex items-stretch rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                      <input
                        type="text"
                        value={dnnFolder}
                        onChange={e => handleDnnFolder(e.target.value)}
                        placeholder="/Portals/0/Images/"
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs focus:outline-none"
                      />
                      <div className="flex items-center px-2 py-1.5 bg-gray-50 border-l border-gray-300 text-xs text-gray-500 font-mono whitespace-nowrap max-w-[40%] overflow-hidden text-ellipsis">
                        {dnnFilename || <span className="text-gray-300 italic font-sans">filename</span>}
                      </div>
                    </div>
                    {dnnPath
                      ? <p className="mt-1 text-xs text-gray-400 font-mono truncate">→ {dnnPath}</p>
                      : <p className="mt-1 text-xs text-gray-400">Enter the folder where you will upload this image.</p>
                    }
                  </div>
                </div>
              )}

              {/* URL input */}
              {mode === 'url' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => handleUrlInput(e.target.value)}
                    placeholder="https://example.com/images/campus.jpg"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Section 2: Alt text */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <SectionLabel number={2} title="Alt text" done={hasAlt} />
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Describe the image <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={alt}
                onChange={e => {
                  setState(s => ({ ...s, alt: e.target.value }))
                  if (e.target.value.trim()) setAltWarned(false)
                }}
                onBlur={() => { if (!alt.trim()) setAltWarned(true) }}
                placeholder="e.g. Aerial view of the main campus on a sunny day"
                className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${altWarned ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              />
              {altWarned && (
                <p className="mt-1 text-xs text-red-500 font-medium">Alt text is required.</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Required for accessibility. Avoid starting with "Image of…"
              </p>
            </div>

            {/* Section 3: Focal point picker */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <SectionLabel number={3} title="Set focal point" done={hasImage} />

              {previewUrl ? (
                <>
                  <p className="text-xs text-gray-500 mb-2">
                    Click the most important part of the image — it stays visible when cropped on small screens.
                  </p>
                  <div
                    ref={pickerRef}
                    className="relative rounded-lg overflow-hidden border-2 border-dashed border-blue-300 bg-gray-50 cursor-crosshair select-none"
                    onClick={handleFocalClick}
                  >
                    <img
                      src={previewUrl}
                      alt="Click to set focal point"
                      className="w-full object-cover block pointer-events-none"
                      style={{ maxHeight: '300px' }}
                      draggable={false}
                      onLoad={handleNaturalLoad}
                      onError={() => setState(s => ({ ...s, previewUrl: '' }))}
                    />
                    {/* Focal point marker */}
                    <div
                      className="absolute pointer-events-none"
                      style={{ left: `${focalX}%`, top: `${focalY}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center bg-blue-600/70">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    </div>
                    {/* Crop overlay */}
                    {cropOverlay && (
                      <div
                        className="absolute pointer-events-none border-2 border-dashed border-yellow-400"
                        style={{
                          left:   `${cropOverlay.left}%`,
                          top:    `${cropOverlay.top}%`,
                          width:  `${cropOverlay.width}%`,
                          height: `${cropOverlay.height}%`,
                        }}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Focal point: <span className="font-mono text-gray-500">{focalX}% from left, {focalY}% from top</span>.
                    {cropOverlay && <> Yellow box = crop at <span className="font-medium text-gray-500">{currentPreset.label}</span>.</>}
                  </p>
                </>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center h-32">
                  <p className="text-xs text-gray-400">Image preview will appear here</p>
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT: preview + HTML (stacked on lg, side-by-side on xl) ── */}
          <div className="w-full flex-1 min-w-0 flex flex-col xl:flex-row gap-4 items-start">

            {/* ── MIDDLE: Crop preview ── */}
            <div className="w-full xl:flex-1 min-w-0">

            {/* Crop preview */}
            {previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                {/* Toolbar */}
                <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium shrink-0">
                    Preview
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {PRESETS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setState(s => ({ ...s, simPreset: p.key }))}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors
                          ${simPreset === p.key
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-200 border border-gray-300'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isMobile ? (
                  <div className="w-full bg-gray-50">
                    <img
                      src={previewUrl}
                      alt="Mobile preview"
                      className="w-full block"
                      style={{ objectFit: 'contain', height: 'auto' }}
                    />
                    <p className="text-center text-xs text-gray-400 py-1.5">Mobile — image is not cropped</p>
                  </div>
                ) : (
                  <div
                    className="w-full overflow-hidden"
                    style={{ aspectRatio: `${currentPreset.width} / ${HERO_HEIGHT}` }}
                  >
                    <img
                      src={previewUrl}
                      alt="Crop preview"
                      className="w-full h-full object-cover block"
                      style={{ objectPosition: `${focalX}% ${focalY}%` }}
                      onLoad={handleNaturalLoad}
                    />
                  </div>
                )}

                {showSizeWarning && (
                  <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 flex items-center gap-1.5">
                    <span>⚠</span>
                    <span>Image is only {imgNatural.w}px wide — may appear blurry at {currentPreset.label}.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white flex items-center justify-center" style={{ height: '200px' }}>
                <p className="text-xs text-gray-400">Crop preview will appear here</p>
              </div>
            )}

            </div>{/* ── END MIDDLE ── */}

            {/* ── RIGHT: HTML output ── */}
            <div className="w-full xl:w-96 shrink-0">
              <div className={`bg-white rounded-xl shadow-sm border p-4 transition-opacity
                ${isComplete ? 'border-gray-100 opacity-100' : 'border-gray-100 opacity-50 pointer-events-none'}`}>
                <SectionLabel number={4} title="Your HTML code" done={false} />

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
                      <pre className="p-3 text-xs text-green-300 overflow-x-auto overflow-y-auto whitespace-pre font-mono leading-relaxed">
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
                    Fill in your image source and alt text to generate the code.
                  </p>
                )}
              </div>
            </div>{/* ── END RIGHT ── */}

          </div>{/* ── END RIGHT WRAPPER ── */}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Created by Ectropy</p>
      </div>
    </div>
  )
}
