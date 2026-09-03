import React from 'react'
import { createRoot } from 'react-dom/client'

import { LanguageProvider } from './i18n/LanguageContext.jsx'
import App from './App.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
)
