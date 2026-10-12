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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
