import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

const STATE_KEYS = ['wee:last-point', 'wee:last-forecast']

/** Shows a recovery screen instead of a blank page if rendering crashes. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  private reset = () => {
    try {
      for (const key of STATE_KEYS) localStorage.removeItem(key)
    } catch {
      // storage unavailable: a plain reload is still worth trying
    }
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-3xl" aria-hidden>
          ⚠️
        </p>
        <p className="text-sm">Something went wrong while loading Wee.</p>
        <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{this.state.error.message}</p>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Reload
        </button>
      </div>
    )
  }
}
