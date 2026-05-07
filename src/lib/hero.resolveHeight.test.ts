import { describe, it, expect } from 'vitest'
import { resolveHeight, HEIGHT_PRESETS } from './hero'

describe('resolveHeight', () => {
  describe('preset modes', () => {
    it('returns the short preset clamp', () => {
      expect(resolveHeight('short', 0, 0, 0).clamp).toBe('clamp(220px, 13vw, 440px)')
    })

    it('returns the standard preset clamp', () => {
      expect(resolveHeight('standard', 0, 0, 0).clamp).toBe('clamp(350px, 21vw, 700px)')
    })

    it('returns the tall preset clamp', () => {
      expect(resolveHeight('tall', 0, 0, 0).clamp).toBe('clamp(450px, 28vw, 850px)')
    })

    it('returns the extra-tall preset clamp', () => {
      expect(resolveHeight('extra-tall', 0, 0, 0).clamp).toBe('clamp(600px, 38vw, 1100px)')
    })

    it('ignores customMin/customVw/customMax for non-custom presets', () => {
      const a = resolveHeight('standard', 0,    0,  0)
      const b = resolveHeight('standard', 999, 99, 9999)
      expect(a.clamp).toBe(b.clamp)
    })
  })

  describe('preset calcH math (clamp semantics)', () => {
    it('short calcH respects min, vw, and max bounds', () => {
      const { calcH } = resolveHeight('short', 0, 0, 0)
      expect(calcH(1000)).toBe(220)            // 0.13 * 1000 = 130 → clamped up to min 220
      expect(calcH(2500)).toBe(2500 * 0.13)    // mid range
      expect(calcH(10000)).toBe(440)           // 1300 → clamped down to max 440
    })

    it('standard calcH respects bounds', () => {
      const { calcH } = resolveHeight('standard', 0, 0, 0)
      expect(calcH(1000)).toBe(350)
      expect(calcH(2000)).toBe(2000 * 0.21)
      expect(calcH(10000)).toBe(700)
    })

    it('tall calcH respects bounds', () => {
      const { calcH } = resolveHeight('tall', 0, 0, 0)
      expect(calcH(1000)).toBe(450)
      expect(calcH(2000)).toBe(2000 * 0.28)
      expect(calcH(10000)).toBe(850)
    })

    it('extra-tall calcH respects bounds', () => {
      const { calcH } = resolveHeight('extra-tall', 0, 0, 0)
      expect(calcH(1000)).toBe(600)
      expect(calcH(2000)).toBe(2000 * 0.38)
      expect(calcH(10000)).toBe(1100)
    })
  })

  describe('custom mode', () => {
    it('builds clamp string from customMin/customVw/customMax', () => {
      expect(resolveHeight('custom', 300, 25, 800).clamp).toBe('clamp(300px, 25vw, 800px)')
    })

    it('custom calcH respects min/vw/max bounds', () => {
      const { calcH } = resolveHeight('custom', 300, 25, 800)
      expect(calcH(1000)).toBe(300)            // 250 < min
      expect(calcH(2000)).toBe(500)            // 25% of 2000
      expect(calcH(10000)).toBe(800)           // 2500 > max
    })

    it('when min > max, current behavior: clamp string echoes inputs and calcH always returns max', () => {
      // Documents (does not enforce) current behavior. The UI's customFields
      // config prevents this state, but resolveHeight itself does not validate.
      const { clamp, calcH } = resolveHeight('custom', 800, 25, 300)
      expect(clamp).toBe('clamp(800px, 25vw, 300px)')
      expect(calcH(500)).toBe(300)
      expect(calcH(2000)).toBe(300)
      expect(calcH(10000)).toBe(300)
    })
  })

  describe('fallback', () => {
    it('falls back to standard for an unknown key', () => {
      // @ts-expect-error — testing runtime fallback for an invalid key
      const result = resolveHeight('not-a-real-key', 0, 0, 0)
      expect(result.clamp).toBe('clamp(350px, 21vw, 700px)')
    })
  })

  describe('HEIGHT_PRESETS shape', () => {
    it('exposes 5 presets including custom (which has no clamp/calcH)', () => {
      expect(HEIGHT_PRESETS).toHaveLength(5)
      const custom = HEIGHT_PRESETS.find(p => p.key === 'custom')!
      expect(custom.clamp).toBeUndefined()
      expect(custom.calcH).toBeUndefined()
    })

    it('every non-custom preset has both clamp and calcH defined', () => {
      for (const p of HEIGHT_PRESETS.filter(p => p.key !== 'custom')) {
        expect(p.clamp).toMatch(/^clamp\(\d+px, \d+vw, \d+px\)$/)
        expect(typeof p.calcH).toBe('function')
      }
    })
  })
})
