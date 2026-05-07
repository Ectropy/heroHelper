import { describe, it, expect } from 'vitest'
import { safeImageUrl } from './hero'

describe('safeImageUrl', () => {
  describe('accepted inputs', () => {
    it('passes through https URLs', () => {
      expect(safeImageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg')
    })

    it('passes through http URLs', () => {
      expect(safeImageUrl('http://example.com/img.jpg')).toBe('http://example.com/img.jpg')
    })

    it('passes through DNN-style root-relative paths', () => {
      expect(safeImageUrl('/Portals/0/Images/campus.jpg')).toBe('/Portals/0/Images/campus.jpg')
    })

    it('passes through any single-leading-slash path', () => {
      expect(safeImageUrl('/img.png')).toBe('/img.png')
    })

    it('preserves query strings and fragments on http(s) URLs', () => {
      expect(safeImageUrl('https://cdn.example.com/img.jpg?v=2#hero'))
        .toBe('https://cdn.example.com/img.jpg?v=2#hero')
    })

    it('trims surrounding whitespace before validating', () => {
      expect(safeImageUrl('  https://example.com/img.jpg  ')).toBe('https://example.com/img.jpg')
      expect(safeImageUrl('\n/Portals/0/img.jpg\t')).toBe('/Portals/0/img.jpg')
    })
  })

  describe('rejected inputs', () => {
    it('rejects empty string', () => {
      expect(safeImageUrl('')).toBe('')
    })

    it('rejects whitespace-only', () => {
      expect(safeImageUrl('   ')).toBe('')
      expect(safeImageUrl('\n\t')).toBe('')
    })

    it('rejects protocol-relative URLs (//host/path)', () => {
      // The double-slash check is what stops these from being treated as
      // root-relative. They would otherwise inherit the page protocol — risky
      // when the page is served over file:// or a non-http context.
      expect(safeImageUrl('//cdn.example.com/img.jpg')).toBe('')
    })

    it('rejects javascript: URLs', () => {
      expect(safeImageUrl('javascript:alert(1)')).toBe('')
    })

    it('rejects data: URLs', () => {
      expect(safeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('')
    })

    it('rejects ftp: URLs', () => {
      expect(safeImageUrl('ftp://example.com/img.jpg')).toBe('')
    })

    it('rejects file: URLs', () => {
      expect(safeImageUrl('file:///C:/Users/me/img.jpg')).toBe('')
    })

    it('rejects relative paths without leading slash', () => {
      expect(safeImageUrl('images/foo.jpg')).toBe('')
      expect(safeImageUrl('./img.jpg')).toBe('')
      expect(safeImageUrl('../img.jpg')).toBe('')
    })

    it('rejects bare hostnames (no protocol, no leading slash)', () => {
      expect(safeImageUrl('example.com/img.jpg')).toBe('')
    })

    it('rejects free text', () => {
      expect(safeImageUrl('not a url')).toBe('')
    })
  })
})
