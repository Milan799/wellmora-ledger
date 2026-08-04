import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global window event listeners to swallow non-fatal browser extension message channel errors
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || String(event?.reason || '');
  if (
    msg.includes('message channel closed before a response was received') ||
    msg.includes('listener indicated an asynchronous response')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || String(event || '');
  if (
    msg.includes('message channel closed before a response was received') ||
    msg.includes('listener indicated an asynchronous response')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
