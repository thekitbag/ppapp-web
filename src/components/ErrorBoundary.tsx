import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="card-brutal p-6 max-w-md text-center">
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Something went wrong
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Please refresh the page. If the issue persists, contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-brutal px-4 py-2 rounded-lg"
              style={{ background: 'var(--color-primary)', color: 'white', fontFamily: 'var(--font-display)' }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
