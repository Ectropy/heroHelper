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

// ── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${active ? 'bg-blue-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}
            >
              {done ? '✓' : step}
            </div>
            {step < total && (
              <div className={`h-0.5 w-10 ${step < current ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Image source ────────────────────────────────────────────────────
function Step1({ state, setState }) {
  const { mode, previewUrl, dnnPath, urlInput } = state
  const fileRef = useRef(null)

  // Split dnnPath into folder and filename for display
  const lastSlash = dnnPath.lastIndexOf('/')
  const dnnFolder = lastSlash >= 0 ? dnnPath.slice(0, lastSlash + 1) : ''
  const dnnFilename = lastSlash >= 0 ? dnnPath.slice(lastSlash + 1) : dnnPath

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

  const handleUrlInput = (val) => {
    setState(s => ({ ...s, urlInput: val, previewUrl: val }))
  }

  const handleDnnFolder = (val) => {
    // Ensure folder always ends with / when non-empty
    const newPath = val + dnnFilename
    localStorage.setItem(STORAGE_KEY, newPath)
    setState(s => ({ ...s, dnnPath: newPath }))
  }

  const handleModeChange = (newMode) => {
    setState(s => ({ ...s, mode: newMode, previewUrl: '', urlInput: '', dnnPath: '' }))
    if (fileRef.current) fileRef.current.value = ''
  }

  const srcForOutput = mode === 'url' ? urlInput : dnnPath
  const canProceed = mode === 'url' ? urlInput.trim() !== '' : (previewUrl !== '' && dnnPath.trim() !== '')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Step 1 — Choose your image</h2>
        <p className="text-gray-500 text-sm">Select where your image is coming from.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-3">
        {[
          { id: 'pc', label: 'Upload from my computer' },
          { id: 'url', label: 'Use a web URL' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleModeChange(id)}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Choose an image file
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DNN server path for this image
            </label>
            {/* Joined folder + filename inputs */}
            <div className="flex items-stretch rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <input
                type="text"
                value={dnnFolder}
                onChange={e => handleDnnFolder(e.target.value)}
                placeholder="/Portals/0/Images/"
                className="flex-1 min-w-0 px-3 py-2 text-sm focus:outline-none"
              />
              <div className="flex items-center px-3 py-2 bg-gray-50 border-l border-gray-300 text-sm text-gray-500 font-mono whitespace-nowrap max-w-[40%] overflow-hidden text-ellipsis">
                {dnnFilename || <span className="text-gray-300 italic font-sans">filename</span>}
              </div>
            </div>
            {/* Full path preview */}
            {dnnPath && (
              <p className="mt-1.5 text-xs text-gray-400 font-mono truncate">
                → {dnnPath}
              </p>
            )}
            {!dnnPath && (
              <p className="mt-1 text-xs text-gray-400">
                Enter the folder path where you uploaded (or will upload) this image in DNN's file manager.
              </p>
            )}
          </div>
        </div>
      )}

      {/* URL input */}
      {mode === 'url' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL
          </label>
          <input
            type="url"
            value={urlInput}
            onChange={e => handleUrlInput(e.target.value)}
            placeholder="https://example.com/images/campus.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-h-48 object-cover"
            onError={() => setState(s => ({ ...s, previewUrl: '' }))}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          disabled={!canProceed}
          onClick={() => setState(s => ({ ...s, step: 2, src: srcForOutput }))}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm
            disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Alt text ────────────────────────────────────────────────────────
function Step2({ state, setState }) {
  const { alt } = state
  const [warned, setWarned] = useState(false)

  const handleNext = () => {
    if (!alt.trim()) {
      setWarned(true)
      return
    }
    setState(s => ({ ...s, step: 3 }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Step 2 — Describe your image</h2>
        <p className="text-gray-500 text-sm">
          Alt text helps screen readers and people with visual impairments understand the image.
          It also appears if the image fails to load.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Alt text <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={alt}
          onChange={e => {
            setState(s => ({ ...s, alt: e.target.value }))
            if (e.target.value.trim()) setWarned(false)
          }}
          placeholder="e.g. Aerial view of the main campus on a sunny day"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
            ${warned ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
        />
        {warned && (
          <p className="mt-1 text-xs text-red-500 font-medium">
            Alt text is required for accessibility. Please describe what's in the image.
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Describe the image concisely — what it shows, and why it's there. Avoid starting with "Image of…"
        </p>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setState(s => ({ ...s, step: 1 }))}
          className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Focal point picker ───────────────────────────────────────────────
function Step3({ state, setState }) {
  const { previewUrl, focalX, focalY } = state
  const imgRef = useRef(null)

  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setState(s => ({ ...s, focalX: Math.round(x), focalY: Math.round(y) }))
  }, [setState])

  const hasFocal = focalX !== null && focalY !== null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Step 3 — Set the focal point</h2>
        <p className="text-gray-500 text-sm">
          Click on the most important part of your image — the part that should always stay visible
          when the image is cropped on different screen sizes.
        </p>
      </div>

      {/* Image picker */}
      <div
        className="relative rounded-xl overflow-hidden border-2 border-dashed border-blue-300 bg-gray-50 cursor-crosshair select-none"
        style={{ maxHeight: '400px' }}
        onClick={handleClick}
      >
        <img
          ref={imgRef}
          src={previewUrl}
          alt="Click to set focal point"
          className="w-full object-cover block pointer-events-none"
          style={{ maxHeight: '400px' }}
          draggable={false}
        />

        {/* Focal point marker */}
        {hasFocal && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${focalX}%`,
              top: `${focalY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Outer ring */}
            <div className="w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center bg-blue-600/70">
              {/* Inner dot */}
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>
        )}

        {/* Helper overlay when no focal point set */}
        {!hasFocal && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Click anywhere on the image
            </div>
          </div>
        )}
      </div>

      {hasFocal && (
        <p className="text-sm text-gray-500">
          Focal point set at{' '}
          <span className="font-mono font-medium text-gray-700">{focalX}% from left, {focalY}% from top</span>.
          Click the image again to reposition.
        </p>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setState(s => ({ ...s, step: 2 }))}
          className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          disabled={!hasFocal}
          onClick={() => setState(s => ({ ...s, step: 4 }))}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm
            disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Generate Code →
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Output ──────────────────────────────────────────────────────────
function Step4({ state, setState }) {
  const { src, alt, focalX, focalY } = state
  const [copied, setCopied] = useState(false)

  const html = generateHtml({ src, alt, focalX, focalY })

  const handleCopy = () => {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleStartOver = () => {
    setState({
      step: 1,
      mode: 'pc',
      previewUrl: '',
      dnnPath: localStorage.getItem(STORAGE_KEY) || '',
      urlInput: '',
      src: '',
      alt: '',
      focalX: null,
      focalY: null,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Your HTML code is ready!</h2>
        <p className="text-gray-500 text-sm">
          Copy the code below and paste it into your DNN Text/HTML module.
        </p>
      </div>

      {/* Preview */}
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-200">
          Preview (desktop crop)
        </div>
        <div
          className="w-full overflow-hidden"
          style={{ height: '200px' }}
        >
          <img
            src={state.previewUrl}
            alt={alt}
            className="w-full h-full object-cover block"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        </div>
      </div>

      {/* Code block */}
      <div className="relative">
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span className="text-xs text-gray-400 font-medium">HTML</span>
            <button
              onClick={handleCopy}
              className={`text-xs font-medium px-3 py-1 rounded-md transition-colors
                ${copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
            >
              {copied ? '✓ Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <pre className="p-4 text-sm text-green-300 overflow-x-auto whitespace-pre font-mono leading-relaxed">
            {html}
          </pre>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setState(s => ({ ...s, step: 3 }))}
          className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          ← Adjust focal point
        </button>
        <button
          onClick={handleStartOver}
          className="px-6 py-2 bg-gray-800 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors"
        >
          Start over
        </button>
      </div>
    </div>
  )
}

// ── App root ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'hh-dnn-path'

export default function App() {
  const [state, setState] = useState({
    step: 1,
    mode: 'pc',
    previewUrl: '',
    dnnPath: localStorage.getItem(STORAGE_KEY) || '',
    urlInput: '',
    src: '',
    alt: '',
    focalX: null,
    focalY: null,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Hero Image Helper</h1>
          <p className="mt-1 text-gray-500">
            Build a hero image banner for your DNN page — no coding required.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <StepIndicator current={state.step} total={4} />

          {state.step === 1 && <Step1 state={state} setState={setState} />}
          {state.step === 2 && <Step2 state={state} setState={setState} />}
          {state.step === 3 && <Step3 state={state} setState={setState} />}
          {state.step === 4 && <Step4 state={state} setState={setState} />}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Created by Ectropy
        </p>
      </div>
    </div>
  )
}
