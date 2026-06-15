import { HeroImageTool } from './components/HeroImageTool'
import { HeroVideoTool } from './components/HeroVideoTool'
import { useHashRoute, type Route } from './lib/useHashRoute'
import { REPO_URL, SIDENAV_URL, COMPONENT_DRAWER_URL, COMPONENT_CARDS_URL } from './lib/config'

type NavItem =
  | { kind: 'route'; id: Route; label: string }
  | { kind: 'external'; id: string; label: string; href: string }

const NAV_ITEMS: NavItem[] = [
  { kind: 'route', id: 'image', label: 'Hero Image' },
  { kind: 'route', id: 'video', label: 'Hero Video' },
  { kind: 'external', id: 'sidenav', label: 'Sidenav', href: SIDENAV_URL },
  { kind: 'external', id: 'drawer', label: 'Drawer', href: COMPONENT_DRAWER_URL },
  { kind: 'external', id: 'cards', label: 'Cards', href: COMPONENT_CARDS_URL },
]

export default function App() {
  const [route] = useHashRoute()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <div className="flex-1 w-full py-2 px-4">

        {/* Nav: Hero Image | Hero Video */}
        <nav className="mb-4 text-sm" aria-label="Tool selector">
          {NAV_ITEMS.map((item, i) => (
            <span key={item.id}>
              {i > 0 && <span className="mx-2 text-gray-300">|</span>}
              {item.kind === 'external' ? (
                <a href={item.href} className="text-gray-500 hover:text-blue-600 hover:underline">{item.label}</a>
              ) : route === item.id ? (
                <span className="font-semibold text-blue-600" aria-current="page">{item.label}</span>
              ) : (
                <a href={`#/${item.id}`} className="text-gray-500 hover:text-blue-600 hover:underline">{item.label}</a>
              )}
            </span>
          ))}
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{route === 'video' ? 'Hero Video Helper' : 'Hero Image Helper'}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {route === 'video'
              ? 'Easily generate hero video HTML for a DVIDS video.'
              : 'Easily generate hero image HTML for any image.'}
          </p>
        </div>

        {route === 'video' ? <HeroVideoTool /> : <HeroImageTool />}

      </div>
      <footer className="sticky bottom-0 px-2 py-1 bg-white border-t border-gray-200 flex-shrink-0 flex justify-center sm:justify-end">
        <span className="text-[10px] text-gray-400 leading-none">Hero Helper v{__APP_VERSION__} • <a className="underline hover:text-blue-500" href={REPO_URL} target="_blank" rel="noreferrer">View on GitHub</a></span>
      </footer>
    </div>
  )
}
