import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

// Must run before React mounts — Login's useEffect fires before App's,
// so storing the code here guarantees it's in sessionStorage in time.
// Wrapped in try/catch: Safari can throw on storage access in certain
// privacy configurations; we must not crash before React mounts.
try {
  const oauthCode = new URLSearchParams(window.location.search).get('code')
  if (oauthCode) {
    sessionStorage.setItem('spotify_oauth_code', oauthCode)
    window.history.replaceState({}, '', window.location.pathname)
  }
} catch { /* storage unavailable — Login will show the connect button */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
