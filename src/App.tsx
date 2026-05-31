import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isLoggedIn } from './api/auth'
import { GameOver } from './pages/GameOver'
import { Login } from './pages/Login'
import { Round } from './pages/Round'
import { RoundResult } from './pages/RoundResult'
import { Setup } from './pages/Setup'
import { useGameStore } from './store/gameStore'

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
  )
}
