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
  const [state, setState] = useState({
    mode: 'pc',
    previewUrl: '',
    dnnPath: localStorage.getItem(STORAGE_KEY) || '',
    urlInput: '',
    src: '',
    alt: '',
    focalX: 50,
    focalY: 50,
  })
  const [altWarned, setAltWarned] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Derived values ──────────────────────────────────────────────────────────
  const { mode, previewUrl, dnnPath, urlInput, alt, focalX, focalY } = state

  const lastSlash = dnnPath.lastIndexOf('/')
  const dnnFolder = lastSlash >= 0 ? dnnPath.slice(0, lastSlash + 1) : ''
  const dnnFilename = lastSlash >= 0 ? dnnPath.slice(lastSlash + 1) : dnnPath

  const srcForOutput = mode === 'url' ? urlInput : dnnPath
  const hasImage = mode === 'url' ? urlInput.trim() !== '' : (previewUrl !== '' && dnnPath.trim() !== '')
  const hasAlt = alt.trim() !== ''
  const isComplete = hasImage && hasAlt

  const html = isComplete ? generateHtml({ src: srcForOutput, alt, focalX, focalY }) : ''

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
      return { ...s, previewUrl: objectUrl, dnnPath: newPath }
    })
  }

  const handleDnnFolder = (val) => {
    const newPath = val + dnnFilename
    localStorage.setItem(STORAGE_KEY, newPath)
    setState(s => ({ ...s, dnnPath: newPath }))
  }

  const handleModeChange = (newMode) => {
    setState(s => ({ ...s, mode: newMode, previewUrl: '', urlInput: '', dnnPath: '' }))
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUrlInput = (val) => {
    setState(s => ({ ...s, urlInput: val, previewUrl: val }))
  }

  const handleFocalClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setState(s => ({ ...s, focalX: Math.round(x), focalY: Math.round(y) }))
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
    })
    setAltWarned(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="w-full max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Hero Image Helper</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Build a hero image banner for your DNN page — no coding required.
          </p>
        </div>

        {/* Two-column layout */}
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
                    className="relative rounded-lg overflow-hidden border-2 border-dashed border-blue-300 bg-gray-50 cursor-crosshair select-none"
                    onClick={handleFocalClick}
                  >
                    <img
                      src={previewUrl}
                      alt="Click to set focal point"
                      className="w-full object-cover block pointer-events-none"
                      style={{ maxHeight: '300px' }}
                      draggable={false}
                      onError={() => setState(s => ({ ...s, previewUrl: '' }))}
                    />
                    <div
                      className="absolute pointer-events-none"
                      style={{ left: `${focalX}%`, top: `${focalY}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center bg-blue-600/70">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Focal point: <span className="font-mono text-gray-500">{focalX}% from left, {focalY}% from top</span>. Click to reposition.
                  </p>

                </>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center h-32">
                  <p className="text-xs text-gray-400">Image preview will appear here</p>
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT: Crop preview + HTML output ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Crop preview */}
            {previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-200">
                  Preview (desktop crop)
                </div>
                <div className="w-full overflow-hidden" style={{ height: '200px' }}>
                  <img
                    src={previewUrl}
                    alt="Crop preview"
                    className="w-full h-full object-cover block"
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white flex items-center justify-center" style={{ height: '200px' }}>
                <p className="text-xs text-gray-400">Crop preview will appear here</p>
              </div>
            )}

            {/* Section 4: Output */}
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
                    <pre className="p-3 text-xs text-green-300 overflow-x-auto whitespace-pre font-mono leading-relaxed">
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

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Created by Ectropy</p>
      </div>
    </div>
  )
}
