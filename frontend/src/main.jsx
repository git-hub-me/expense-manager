import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', backgroundColor: '#F5F5F0', padding: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white', borderRadius: '24px', padding: '32px',
              maxWidth: '320px', width: '100%', textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1A1A1A', marginBottom: '8px' }}>
              Something went wrong
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#8A8A70', marginBottom: '24px' }}>
              An unexpected error occurred. Reload the app to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#5A5A40', color: 'white', border: 'none',
                borderRadius: '16px', padding: '12px 28px', fontSize: '14px',
                fontFamily: 'Inter, sans-serif', cursor: 'pointer', width: '100%',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
