import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global window event listeners to swallow non-fatal browser extension message channel errors
const isExtensionMsgError = (err) => {
  const str = String(err?.message || err?.reason?.message || err || '').toLowerCase();
  return (
    str.includes('message channel closed before a response was received') ||
    str.includes('listener indicated an asynchronous response') ||
    str.includes('asynchronous response by returning true')
  );
};

window.addEventListener('unhandledrejection', (event) => {
  if (isExtensionMsgError(event?.reason) || isExtensionMsgError(event)) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (isExtensionMsgError(event?.error) || isExtensionMsgError(event)) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
