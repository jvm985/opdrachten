import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider 
      clientId="339058057860-i6ne31mqs27mqm2ulac7al9vi26pmgo1.apps.googleusercontent.com"
    >
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
