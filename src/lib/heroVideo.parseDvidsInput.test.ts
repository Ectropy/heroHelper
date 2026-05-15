import { describe, it, expect } from 'vitest'
import { parseDvidsInput } from './heroVideo'

describe('parseDvidsInput', () => {
  it('parses a full DVIDS iframe embed', () => {
    const iframe = '<iframe src="https://www.dvidshub.net/video/embed/996624" width="800" height="450" frameborder="0" allowtransparency allowfullscreen></iframe>'
    expect(parseDvidsInput(iframe)).toEqual({
      videoId: '996624',
      m3u8Url: 'https://www.dvidshub.net/video/996624.m3u8',
    })
  })

  it('parses an iframe with single-quoted attributes', () => {
    const iframe = "<iframe src='https://www.dvidshub.net/video/embed/12345'></iframe>"
    expect(parseDvidsInput(iframe)?.videoId).toBe('12345')
  })

  it('parses a bare embed URL', () => {
    expect(parseDvidsInput('https://www.dvidshub.net/video/embed/996624')).toEqual({
      videoId: '996624',
      m3u8Url: 'https://www.dvidshub.net/video/996624.m3u8',
    })
  })

  it('parses a bare watch URL (no /embed/)', () => {
    expect(parseDvidsInput('https://www.dvidshub.net/video/996624')).toEqual({
      videoId: '996624',
      m3u8Url: 'https://www.dvidshub.net/video/996624.m3u8',
    })
  })

  it('parses a URL with extra path segments after the ID', () => {
    expect(parseDvidsInput('https://www.dvidshub.net/video/996624/some-slug')?.videoId).toBe('996624')
  })

  it('parses a raw numeric ID', () => {
    expect(parseDvidsInput('996624')).toEqual({
      videoId: '996624',
      m3u8Url: 'https://www.dvidshub.net/video/996624.m3u8',
    })
  })

  it('trims whitespace before parsing', () => {
    expect(parseDvidsInput('   996624   \n')?.videoId).toBe('996624')
  })

  it('returns null for empty input', () => {
    expect(parseDvidsInput('')).toBeNull()
    expect(parseDvidsInput('   ')).toBeNull()
  })

  it('returns null for non-DVIDS URLs', () => {
    expect(parseDvidsInput('https://example.com/video/123')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseDvidsInput('abc')).toBeNull()
    expect(parseDvidsInput('123abc')).toBeNull()
  })

  it('returns null for an iframe with a non-DVIDS src', () => {
    expect(parseDvidsInput('<iframe src="https://youtube.com/embed/abc"></iframe>')).toBeNull()
  })
})
