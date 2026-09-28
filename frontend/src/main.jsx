import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// In Capacitor native mobile app, ensure any stray service workers or caches are completely cleared
try {
  const isNative = (
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
    window.location.hostname === 'localhost' ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:'
  );
  if (isNative && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      for (const r of regs) r.unregister();
    }).catch(() => {});
    if ('caches' in window) {
      caches.keys().then(keys => {
        for (const k of keys) caches.delete(k);
      }).catch(() => {});
    }
  }
} catch (_) {}

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

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Wellmora Ledger Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#F3E8D2', marginBottom: '8px' }}>
            Wellmora Ledger
          </h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '320px', lineHeight: '1.5', marginBottom: '16px' }}>
            An unexpected error prevented the page from displaying.
          </p>
          <pre style={{
            background: '#1e293b',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '11px',
            maxWidth: '90%',
            overflow: 'auto',
            color: '#f43f5e',
            border: '1px solid rgba(244, 63, 94, 0.3)'
          }}>
            {String(this.state.error?.message || this.state.error || 'Unknown Error')}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Clear Cache & Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
