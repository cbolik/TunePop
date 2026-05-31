import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

// Must run before React mounts — Login's useEffect fires before App's,
// so storing the code here guarantees it's in sessionStorage in time.
const oauthCode = new URLSearchParams(window.location.search).get('code')
if (oauthCode) {
  sessionStorage.setItem('spotify_oauth_code', oauthCode)
  window.history.replaceState({}, '', window.location.pathname)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
