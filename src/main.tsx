import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

if (/^\/iyonic-mailer\/dashboard\/?$/.test(window.location.pathname)) {
  window.history.replaceState(
    null,
    '',
    `/#/iyonic-mailer/dashboard${window.location.search}`,
  )
}

// The app uses HashRouter, but IyonicDB links are also shared as normal paths
// (for example /iyonicdb/console?section=keys). Move those paths into the
// router hash before it mounts so direct visits and refreshes keep their target.
if (/^\/iyonicdb(?:\/|$)/.test(window.location.pathname) && !window.location.hash.startsWith('#/')) {
  window.history.replaceState(
    null,
    '',
    `/#${window.location.pathname}${window.location.search}${window.location.hash}`,
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
