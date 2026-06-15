// Canonical upstreams — also used as fallback for dev, tests, and
// non-GitHub-Pages hosts (custom domains, etc.) where we can't infer.
const FALLBACK_HELPER_URL = 'https://darrenolah.github.io/heroHelper/'
const FALLBACK_REPO_URL = 'https://github.com/DarrenOlah/heroHelper'
const FALLBACK_SIDENAV_URL = 'https://darrenolah.github.io/sidenavHelper/'
const FALLBACK_COMPONENT_BASE = 'https://darrenolah.github.io/componentHelper/'

// Sister apps on the same GitHub account are assumed to keep these repo names.
const SIDENAV_REPO_NAME = 'sidenavHelper'
const COMPONENT_REPO_NAME = 'componentHelper'

interface DerivedUrls {
  helperUrl: string
  repoUrl: string
  sidenavUrl: string
  componentBase: string
}

function deriveUrls(): DerivedUrls {
  if (typeof window === 'undefined') {
    return {
      helperUrl: FALLBACK_HELPER_URL,
      repoUrl: FALLBACK_REPO_URL,
      sidenavUrl: FALLBACK_SIDENAV_URL,
      componentBase: FALLBACK_COMPONENT_BASE,
    }
  }

  const { hostname, pathname, origin } = window.location
  const ghMatch = hostname.match(/^([^.]+)\.github\.io$/i)
  if (ghMatch) {
    const user = ghMatch[1]
    const repo = pathname.split('/').filter(Boolean)[0]
    if (repo) {
      return {
        helperUrl: `${origin}/${repo}/`,
        repoUrl: `https://github.com/${user}/${repo}`,
        sidenavUrl: `${origin}/${SIDENAV_REPO_NAME}/`,
        componentBase: `${origin}/${COMPONENT_REPO_NAME}/`,
      }
    }
  }

  return {
    helperUrl: FALLBACK_HELPER_URL,
    repoUrl: FALLBACK_REPO_URL,
    sidenavUrl: FALLBACK_SIDENAV_URL,
    componentBase: FALLBACK_COMPONENT_BASE,
  }
}

const urls = deriveUrls()
export const HELPER_URL = urls.helperUrl
export const REPO_URL = urls.repoUrl
export const SIDENAV_URL = urls.sidenavUrl
export const COMPONENT_DRAWER_URL = `${urls.componentBase}#/drawer`
export const COMPONENT_CARDS_URL = `${urls.componentBase}#/cards`
