import { useEffect, useState } from 'react'

export type Route = 'image' | 'video'

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  return hash === 'video' ? 'video' : 'image'
}

export function useHashRoute(): [Route, (next: Route) => void] {
  const [route, setRouteState] = useState<Route>(() => readRoute())

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/image')
    }
    const onHashChange = () => setRouteState(readRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setRoute = (next: Route) => {
    window.location.hash = `#/${next}`
  }

  return [route, setRoute]
}
