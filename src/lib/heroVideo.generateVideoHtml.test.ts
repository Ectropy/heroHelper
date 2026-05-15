import { describe, it, expect } from 'vitest'
import {
  generateVideoHtml,
  generateVideoPreviewHtml,
  DNN_HLS_SCRIPT_SRC,
  CDN_HLS_SCRIPT_SRC,
  CDN_FONT_AWESOME_HREF,
} from './heroVideo'

const baseInput = {
  m3u8Url: 'https://www.dvidshub.net/video/996624.m3u8',
  captionSrc: '/Portals/153/test.vtt',
  posterUrl: '/Portals/153/poster.png',
  includeFontAwesomeCdn: false,
}

describe('generateVideoHtml', () => {
  it('substitutes all three values into the template', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'dnn' })
    expect(html).toContain(`var src = "${baseInput.m3u8Url}";`)
    expect(html).toContain(`var captionSrc = "${baseInput.captionSrc}";`)
    expect(html).toContain(`var posterUrl = "${baseInput.posterUrl}";`)
  })

  it('uses the DNN HLS.js path when hlsSource is "dnn"', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'dnn' })
    expect(html).toContain(DNN_HLS_SCRIPT_SRC)
    expect(html).not.toContain(CDN_HLS_SCRIPT_SRC)
  })

  it('uses the CDN HLS.js path when hlsSource is "cdn"', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'cdn' })
    expect(html).toContain(CDN_HLS_SCRIPT_SRC)
    expect(html).not.toContain(DNN_HLS_SCRIPT_SRC)
  })

  it('starts with the DVIDS Hero Video module comment', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'dnn' })
    expect(html.startsWith('<!-- DIVIDS Hero Video custom module')).toBe(true)
  })

  it('ends with a closing script tag', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'dnn' })
    expect(html.trimEnd().endsWith('</script>')).toBe(true)
  })

  it('escapes double-quotes in user input so they cannot break out of the JS string', () => {
    const html = generateVideoHtml({
      ...baseInput,
      captionSrc: '/Portals/0/evil"; alert("xss"); var x="',
      hlsSource: 'dnn',
    })
    // The injected value must remain inside the var captionSrc = "..." string.
    expect(html).toContain('var captionSrc = "/Portals/0/evil\\"; alert(\\"xss\\"); var x=\\"";')
    // And the original "/Portals/0/evil\"; alert" pattern must NOT appear unescaped.
    expect(html).not.toMatch(/var captionSrc = "\/Portals\/0\/evil"; alert/)
  })

  it('escapes backslashes in user input', () => {
    const html = generateVideoHtml({
      ...baseInput,
      posterUrl: '/Portals\\path',
      hlsSource: 'dnn',
    })
    expect(html).toContain('var posterUrl = "/Portals\\\\path";')
  })

  it('leaves all four token placeholders fully replaced', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'cdn' })
    expect(html).not.toContain('__M3U8_URL__')
    expect(html).not.toContain('__CAPTION_SRC__')
    expect(html).not.toContain('__POSTER_URL__')
    expect(html).not.toContain('__HLS_SCRIPT_SRC__')
  })
})

describe('generateVideoHtml — Font Awesome opt-in', () => {
  it('injects the Font Awesome CDN link when includeFontAwesomeCdn is true', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'dnn', includeFontAwesomeCdn: true })
    expect(html).toContain(`<link rel="stylesheet" href="${CDN_FONT_AWESOME_HREF}">`)
  })

  it('places the Font Awesome link before the module so it loads first', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'dnn', includeFontAwesomeCdn: true })
    const linkIdx = html.indexOf(CDN_FONT_AWESOME_HREF)
    const moduleIdx = html.indexOf('<!-- DIVIDS Hero Video custom module')
    expect(linkIdx).toBeGreaterThanOrEqual(0)
    expect(moduleIdx).toBeGreaterThan(linkIdx)
  })
})

describe('generateVideoPreviewHtml', () => {
  it('always uses the CDN HLS.js path regardless of input', () => {
    const html = generateVideoPreviewHtml(baseInput)
    expect(html).toContain(CDN_HLS_SCRIPT_SRC)
    expect(html).not.toContain(DNN_HLS_SCRIPT_SRC)
  })

  it('injects a Font Awesome stylesheet so the player icons render', () => {
    const html = generateVideoPreviewHtml(baseInput)
    expect(html).toContain(`<link rel="stylesheet" href="${CDN_FONT_AWESOME_HREF}">`)
  })

  it('does not inject Font Awesome into the production output by default', () => {
    const html = generateVideoHtml({ ...baseInput, hlsSource: 'dnn', includeFontAwesomeCdn: false })
    expect(html).not.toContain(CDN_FONT_AWESOME_HREF)
    expect(html).not.toContain('font-awesome')
  })

  it('substitutes the same three user values', () => {
    const html = generateVideoPreviewHtml(baseInput)
    expect(html).toContain(`var src = "${baseInput.m3u8Url}";`)
    expect(html).toContain(`var captionSrc = "${baseInput.captionSrc}";`)
    expect(html).toContain(`var posterUrl = "${baseInput.posterUrl}";`)
  })
})
