import { describe, it, expect } from 'vitest'
import { computeCropOverlay } from './hero'

// All test cases below use hand-derived values. The geometry is:
//
//   visW  = simWidth  / (scale * imgNatural.w)   where scale = max(simW/imgW, simH/imgH)
//   visH  = simHeight / (scale * imgNatural.h)
//   left  = (1 - visW) * (focalX / 100)
//   top   = (1 - visH) * (focalY / 100)
//
// Hero rect is then mapped into the picker's display space using the same
// formulas applied to (pickerW, pickerH) — but with focal fixed at 50/50 since
// the picker is always centered.

describe('computeCropOverlay', () => {
  describe('null cases', () => {
    it('returns null when simWidth is null (mobile)', () => {
      expect(computeCropOverlay({
        imgNatural: { w: 3840, h: 2160 },
        pickerW: 400, pickerH: 225,
        simWidth: null, heroHeight: 0,
        focalX: 50, focalY: 50,
      })).toBeNull()
    })

    it('returns null when natural image width is 0', () => {
      expect(computeCropOverlay({
        imgNatural: { w: 0, h: 2160 },
        pickerW: 400, pickerH: 225,
        simWidth: 1920, heroHeight: 403.2,
        focalX: 50, focalY: 50,
      })).toBeNull()
    })

    it('returns null when natural image height is 0', () => {
      expect(computeCropOverlay({
        imgNatural: { w: 3840, h: 0 },
        pickerW: 400, pickerH: 225,
        simWidth: 1920, heroHeight: 403.2,
        focalX: 50, focalY: 50,
      })).toBeNull()
    })

    it('returns null when picker has zero width', () => {
      expect(computeCropOverlay({
        imgNatural: { w: 3840, h: 2160 },
        pickerW: 0, pickerH: 225,
        simWidth: 1920, heroHeight: 403.2,
        focalX: 50, focalY: 50,
      })).toBeNull()
    })

    it('returns null when picker has zero height', () => {
      expect(computeCropOverlay({
        imgNatural: { w: 3840, h: 2160 },
        pickerW: 400, pickerH: 0,
        simWidth: 1920, heroHeight: 403.2,
        focalX: 50, focalY: 50,
      })).toBeNull()
    })
  })

  describe('16:9 image, picker matches image aspect (no picker offset)', () => {
    // Image 3840×2160 @ 16:9. Sim 1920×403.2 (standard at 1920vw → 21% = 403.2).
    // heroScale = max(1920/3840, 403.2/2160) = 0.5
    // heroVisW = 1920/(0.5*3840) = 1.0  (no horizontal hero crop)
    // heroVisH = 403.2/(0.5*2160) = 0.37333…
    //
    // Picker 400×225 has the same 16:9 aspect, so:
    // pickerScale = max(400/3840, 225/2160) = 0.10417
    // pickerVisW = 1.0, pickerVisH = 1.0, pickerLeft = 0, pickerTop = 0

    const baseArgs = {
      imgNatural: { w: 3840, h: 2160 },
      pickerW: 400, pickerH: 225,
      simWidth: 1920, heroHeight: 403.2,
    } as const

    it('focal 50/50 → centered horizontally, vertically 31.33% from top', () => {
      const r = computeCropOverlay({ ...baseArgs, focalX: 50, focalY: 50 })!
      expect(r.left).toBeCloseTo(0, 5)
      expect(r.top).toBeCloseTo(31.333, 2)
      expect(r.width).toBeCloseTo(100, 5)
      expect(r.height).toBeCloseTo(37.333, 2)
    })

    it('focal 0/0 → top-left of image', () => {
      const r = computeCropOverlay({ ...baseArgs, focalX: 0, focalY: 0 })!
      expect(r.left).toBeCloseTo(0, 5)
      expect(r.top).toBeCloseTo(0, 5)
      expect(r.width).toBeCloseTo(100, 5)
      expect(r.height).toBeCloseTo(37.333, 2)
    })

    it('focal 100/100 → bottom-right of image', () => {
      const r = computeCropOverlay({ ...baseArgs, focalX: 100, focalY: 100 })!
      expect(r.left).toBeCloseTo(0, 5)             // visW = 1.0, so X has no effect
      expect(r.top).toBeCloseTo(62.667, 2)          // (1 - 0.37333) * 100 = 62.667
      expect(r.width).toBeCloseTo(100, 5)
      expect(r.height).toBeCloseTo(37.333, 2)
    })
  })

  describe('picker is square but image is wide (picker crops horizontally)', () => {
    // Same image + sim as above, but pickerW=300, pickerH=300:
    // pickerScale = max(300/3840, 300/2160) = max(0.0781, 0.1389) = 0.1389
    // pickerVisW = 300/(0.1389*3840) = 0.5625  (picker shows centered 56.25% horiz slice)
    // pickerVisH = 300/(0.1389*2160) = 1.0
    // pickerLeft = 0.5 - 0.28125 = 0.21875
    // pickerTop = 0
    //
    // For focal 50/50: hero rect (left=0, top=0.31333, w=1.0, h=0.37333) mapped:
    //   left = (0 - 0.21875)/0.5625 * 100 = -38.889   (hero extends past left edge of picker view)
    //   width = 1.0/0.5625 * 100 = 177.78

    it('focal 50/50 → hero rect extends past picker view horizontally', () => {
      const r = computeCropOverlay({
        imgNatural: { w: 3840, h: 2160 },
        pickerW: 300, pickerH: 300,
        simWidth: 1920, heroHeight: 403.2,
        focalX: 50, focalY: 50,
      })!
      expect(r.left).toBeCloseTo(-38.889, 2)
      expect(r.top).toBeCloseTo(31.333, 2)
      expect(r.width).toBeCloseTo(177.778, 2)
      expect(r.height).toBeCloseTo(37.333, 2)
    })
  })

  describe('hero crops horizontally (image wider-aspect than hero)', () => {
    // Image 3000×1000 (3:1). Hero 1920×700 (~2.74:1 → narrower than image).
    // heroScale = max(1920/3000, 700/1000) = max(0.64, 0.7) = 0.7
    // heroVisW = 1920/(0.7*3000) = 0.91428…  (hero crops some horizontal)
    // heroVisH = 700/(0.7*1000) = 1.0
    //
    // Picker 360×120 (matches 3:1 aspect): pickerVisW=1.0, pickerVisH=1.0, no offset.

    const baseArgs = {
      imgNatural: { w: 3000, h: 1000 },
      pickerW: 360, pickerH: 120,
      simWidth: 1920, heroHeight: 700,
    } as const

    it('focal 50/50 → hero rect centered horizontally with ~91.43% width', () => {
      const r = computeCropOverlay({ ...baseArgs, focalX: 50, focalY: 50 })!
      expect(r.left).toBeCloseTo(4.286, 2)        // (1-0.91428)*0.5*100
      expect(r.top).toBeCloseTo(0, 5)
      expect(r.width).toBeCloseTo(91.429, 2)
      expect(r.height).toBeCloseTo(100, 5)
    })

    it('focal 0/50 → hero rect anchored at left edge', () => {
      const r = computeCropOverlay({ ...baseArgs, focalX: 0, focalY: 50 })!
      expect(r.left).toBeCloseTo(0, 5)
      expect(r.width).toBeCloseTo(91.429, 2)
    })

    it('focal 100/50 → hero rect anchored at right edge', () => {
      const r = computeCropOverlay({ ...baseArgs, focalX: 100, focalY: 50 })!
      expect(r.left).toBeCloseTo(8.571, 2)         // (1-0.91428)*1*100
      expect(r.width).toBeCloseTo(91.429, 2)
    })
  })
})
