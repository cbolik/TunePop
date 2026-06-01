import { Component, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isLoggedIn } from './api/auth'
import { GameOver } from './pages/GameOver'
import { Login } from './pages/Login'
import { Round } from './pages/Round'
import { RoundResult } from './pages/RoundResult'
import { Setup } from './pages/Setup'
import { useGameStore } from './store/gameStore'

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-5 px-6">
          <p className="text-white font-bold text-lg text-center">Something went wrong</p>
          <p className="text-gray-400 text-sm text-center">
            {(this.state.error as Error).message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-spotify text-white font-bold px-8 py-3 rounded-2xl active:scale-95 transition-all"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const status = useGameStore(s => s.status)
  const setStatus = useGameStore(s => s.setStatus)

  // Sync store status with login state on cold load
  useEffect(() => {
    if (!isLoggedIn() && status !== 'login') {
      setStatus('login')
    }
  }, [status, setStatus])

  return (
    <ErrorBoundary>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/setup"
          element={isLoggedIn() ? <Setup /> : <Navigate to="/" replace />}
        />
        <Route
          path="/round"
          element={isLoggedIn() ? <Round /> : <Navigate to="/" replace />}
        />
        <Route
          path="/result"
          element={isLoggedIn() ? <RoundResult /> : <Navigate to="/" replace />}
        />
        <Route
          path="/gameover"
          element={isLoggedIn() ? <GameOver /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
    </ErrorBoundary>
  )
}
