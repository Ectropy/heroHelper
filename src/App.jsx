import { useState, useRef, useCallback } from 'react'

// Each preset: label, CSS clamp string for generated output, and calcH(vw) for crop math
const HEIGHT_PRESETS = [
  { key: 'short',      label: 'Short',       clamp: 'clamp(220px, 13vw, 440px)',  calcH: vw => Math.min(Math.max(220, vw * 0.13), 440) },
  { key: 'standard',   label: 'Standard',    clamp: 'clamp(350px, 21vw, 700px)',  calcH: vw => Math.min(Math.max(350, vw * 0.21), 700) },
  { key: 'tall',       label: 'Tall',        clamp: 'clamp(450px, 28vw, 850px)',  calcH: vw => Math.min(Math.max(450, vw * 0.28), 850) },
  { key: 'extra-tall', label: 'Extra Tall',  clamp: 'clamp(600px, 38vw, 1100px)', calcH: vw => Math.min(Math.max(600, vw * 0.38), 1100) },
  { key: 'custom',     label: 'Custom' },
]

// Returns { clamp, calcH } for the active height selection, using custom values when needed
function resolveHeight(heightPreset, customMin, customVw, customMax) {
  if (heightPreset === 'custom') {
    const mn = customMin, mx = customMax, v = customVw / 100
    return {
      clamp: `clamp(${mn}px, ${customVw}vw, ${mx}px)`,
      calcH: vw => Math.min(Math.max(mn, vw * v), mx),
    }
  }
  return HEIGHT_PRESETS.find(h => h.key === heightPreset) || HEIGHT_PRESETS[1]
}

const PRESETS = [
  { key: '2160p', label: '2160p (4K UHD)', width: 3840 },
  { key: '1440p', label: '1440p (2K QHD)', width: 2560 },
  { key: '1080p', label: '1080p (Full HD)', width: 1920 },
  { key: '720p',  label: '720p (HD)',       width: 1280 },
  { key: 'tablet', label: 'Tablet (540p)',   width: 960  },
  { key: 'mobile', label: 'Mobile', width: null },
]

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

function generateHtml({ src, alt, focalX, focalY, heightPreset, customMin, customVw, customMax }) {
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

const STORAGE_KEY = 'heroHelper-dnn-folder'

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
    dnnFolder: localStorage.getItem(STORAGE_KEY) || '',
    dnnFile: '',
    urlInput: '',
    src: '',
    alt: '',
    focalX: 50,
    focalY: 50,
    simPreset: '1080p',
    imgNatural: { w: 0, h: 0 },
    heightPreset: 'standard',
    customMin: 350,
    customVw: 21,
    customMax: 700,
  })
  const [altWarned, setAltWarned] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Derived values ──────────────────────────────────────────────────────────
  const { mode, previewUrl, dnnFolder, dnnFile, urlInput, alt, focalX, focalY, simPreset, imgNatural, heightPreset, customMin, customVw, customMax } = state

  const dnnPath = dnnFolder + dnnFile

  const srcForOutput = mode === 'url' ? urlInput : dnnPath
  const hasImage = mode === 'url' ? urlInput.trim() !== '' : (previewUrl !== '' && dnnPath.trim() !== '')
  const hasAlt = alt.trim() !== ''
  const isComplete = hasImage && hasAlt

  const html = isComplete ? generateHtml({ src: srcForOutput, alt, focalX, focalY, heightPreset, customMin, customVw, customMax }) : ''

  const currentPreset = PRESETS.find(p => p.key === simPreset) || PRESETS[2]
  const currentHeight = resolveHeight(heightPreset, customMin, customVw, customMax)
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
    // CSS object-position X% means: cut (1 - visW) * X% from the left
    const hh = currentHeight.calcH(simWidth)
    const heroScale = Math.max(simWidth / imgNatural.w, hh / imgNatural.h)
    const heroVisW = simWidth / (heroScale * imgNatural.w)
    const heroVisH = hh / (heroScale * imgNatural.h)
    const heroLeft = (1 - heroVisW) * (focalX / 100)
    const heroTop  = (1 - heroVisH) * (focalY / 100)

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
    setState(s => ({ ...s, previewUrl: objectUrl, dnnFile: file.name, imgNatural: { w: 0, h: 0 } }))
  }

  const handleDnnFolder = (val) => {
    const clean = val.replace(/[^a-zA-Z0-9/_\-. ]/g, '')
    localStorage.setItem(STORAGE_KEY, clean)
    setState(s => ({ ...s, dnnFolder: clean }))
  }

  const handleModeChange = (newMode) => {
    setState(s => ({ ...s, mode: newMode, previewUrl: '', urlInput: '', dnnFile: '', imgNatural: { w: 0, h: 0 } }))
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
      dnnFolder: localStorage.getItem(STORAGE_KEY) || '',
      dnnFile: '',
      urlInput: '',
      src: '',
      alt: '',
      focalX: 50,
      focalY: 50,
      simPreset: '1080p',
      imgNatural: { w: 0, h: 0 },
      heightPreset: 'standard',
      customMin: 350,
      customVw: 21,
      customMax: 700,
    })
    setAltWarned(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <div className="flex-1 w-full py-2 px-4">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Hero Helper</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Easily generate hero image HTML for any image.
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
                  { id: 'pc', label: 'Image on this PC' },
                  { id: 'url', label: 'Image at a URL' },
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
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
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
                        {dnnFile || <span className="text-gray-300 italic font-sans">filename</span>}
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
                  const clean = e.target.value.replace(/[<>"]/g, '')
                  setState(s => ({ ...s, alt: clean }))
                  if (clean.trim()) setAltWarned(false)
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
                    Click the most important part of the image. It should remain visible on all screen sizes.
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
                    Focal point: <span className="font-mono text-gray-500">{focalX}% from left, {focalY}% from top</span>.<br/>
                    {cropOverlay && <> Yellow box = crop at <span className="font-medium text-gray-500">{currentPreset.label}</span>.</>}
                  </p>
                </>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center h-32">
                  <p className="text-xs text-gray-400">Image preview will appear here</p>
                </div>
              )}
            </div>

            {/* Section 4: Options */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-blue-600 text-white">
                  4
                </div>
                <h2 className="text-base font-semibold text-gray-800">Options</h2>
              </div>

              {/* Hero height */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">Hero height</label>
                <div className="flex gap-1 flex-wrap">
                  {HEIGHT_PRESETS.map(h => (
                    <button
                      key={h.key}
                      onClick={() => setState(s => ({ ...s, heightPreset: h.key }))}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors
                        ${heightPreset === h.key
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {heightPreset === 'short'      ? <>Compact banner. Only for very flat/wide subjects, like the horizon.<span className="block font-mono mt-0.5">clamp(220px, 13vw, 440px)</span></> :
                   heightPreset === 'standard'   ? <>Default height. Requires a not-too-tall subject.<span className="block font-mono mt-0.5">clamp(350px, 21vw, 700px)</span></> :
                   heightPreset === 'tall'       ? <>Taller banner. Shows more of a tall subject.<span className="block font-mono mt-0.5">clamp(450px, 28vw, 850px)</span></> :
                   heightPreset === 'extra-tall' ? <>Very tall banner. Significant vertical coverage.<span className="block font-mono mt-0.5">clamp(600px, 38vw, 1100px)</span></> :
                                                   <>
                                                     <span className="block">Set each clamp value manually.</span>
                                                     <span className="block mt-1"><span className="font-mono">Min</span> and <span className="font-mono">Max</span> are the shortest and tallest the hero can ever be, in pixels.</span>
                                                     <span className="block mt-1"><span className="font-mono">Preferred (vw)</span> is the hero's height as a percentage of the page width — wider browser window, taller hero, so it always looks proportional.</span>
                                                   </>}
                </p>

                {/* Custom clamp inputs */}
                {heightPreset === 'custom' && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Min (px)', key: 'customMin', value: customMin, min: 50, max: customMax - 1 },
                      { label: 'Preferred (vw)', key: 'customVw', value: customVw, min: 1, max: 100 },
                      { label: 'Max (px)', key: 'customMax', value: customMax, min: customMin + 1, max: 2000 },
                    ].map(({ label, key, value, min, max }) => (
                      <div key={key}>
                        <label className="block text-[10px] text-gray-500 mb-0.5">{label}</label>
                        <input
                          type="number"
                          value={value}
                          min={min}
                          max={max}
                          onChange={e => {
                            const n = parseInt(e.target.value, 10)
                            if (!isNaN(n)) setState(s => ({ ...s, [key]: Math.min(Math.max(n, min), max) }))
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    ))}
                    <div className="col-span-3 flex items-center justify-between">
                      <p className="text-[10px] text-gray-400 font-mono">
                        → clamp({customMin}px, {customVw}vw, {customMax}px)
                      </p>
                      <button
                        onClick={() => setState(s => ({ ...s, customMin: 350, customVw: 21, customMax: 700 }))}
                        className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                      >
                        Reset to default
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                    style={{ aspectRatio: `${currentPreset.width} / ${currentHeight.calcH(currentPreset.width)}` }}
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
                <SectionLabel number={5} title="Your HTML code" done={false} />

                {isComplete ? (
                  <>
                    <p className="text-xs text-gray-500 mb-3">
                      Copy and paste into your HTML.
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

      </div>
      <footer className="px-2 py-1 bg-white flex-shrink-0 flex justify-center sm:justify-end">
        <span className="text-[10px] text-gray-400 leading-none">Hero Helper v{__APP_VERSION__} • <a className="underline hover:text-blue-500" href="https://github.com/Ectropy/heroHelper" target="_blank" rel="noreferrer">View on GitHub</a></span>
      </footer>
    </div>
  )
}
