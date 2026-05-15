// Canonical upstreams — also used as fallback for dev, tests, and
// non-GitHub-Pages hosts (custom domains, etc.) where we can't infer.
const FALLBACK_HELPER_URL = 'https://darrenolah.github.io/heroHelper/'
const FALLBACK_REPO_URL = 'https://github.com/DarrenOlah/heroHelper'
const FALLBACK_SIDENAV_URL = 'https://darrenolah.github.io/sidenavHelper/'

// Sister app on the same GitHub account is assumed to keep this repo name.
const SIDENAV_REPO_NAME = 'sidenavHelper'

interface DerivedUrls {
  helperUrl: string
  repoUrl: string
  sidenavUrl: string
}

function deriveUrls(): DerivedUrls {
  if (typeof window === 'undefined') {
    return {
      helperUrl: FALLBACK_HELPER_URL,
      repoUrl: FALLBACK_REPO_URL,
      sidenavUrl: FALLBACK_SIDENAV_URL,
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
      }
    }
  }

  return {
    helperUrl: FALLBACK_HELPER_URL,
    repoUrl: FALLBACK_REPO_URL,
    sidenavUrl: FALLBACK_SIDENAV_URL,
  }
}

const urls = deriveUrls()
export const HELPER_URL = urls.helperUrl
export const REPO_URL = urls.repoUrl
export const SIDENAV_URL = urls.sidenavUrl
