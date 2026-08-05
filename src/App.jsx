import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import AppLayout from './pages/app/AppLayout'
import Home from './pages/app/Home'
import Chat from './pages/app/Chat'
import Recipe from './pages/app/Recipe'
import Cook from './pages/app/Cook'
import Learn from './pages/app/Learn'
import Forum from './pages/app/Forum'
import Profile from './pages/app/Profile'
import Settings from './pages/app/Settings'
import KookaSplash from './pages/loading/KookaSplash'
import './App.css'

// How long the splash stays up at minimum, so the gold-fill animation
// has time to play through even when the page loads instantly.
const SPLASH_MIN_MS = 1800
const SPLASH_FADE_MS = 550

function App() {
  const [booting, setBooting] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const start = performance.now()
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true
      const wait = Math.max(0, SPLASH_MIN_MS - (performance.now() - start))
      window.setTimeout(() => {
        setFadeOut(true)
        window.setTimeout(() => setBooting(false), SPLASH_FADE_MS)
      }, wait)
    }

    // Wait until the page's resources are loaded, then honour the minimum.
    if (document.readyState === 'complete') finish()
    else window.addEventListener('load', finish, { once: true })

    return () => window.removeEventListener('load', finish)
  }, [])

  return (
    <BrowserRouter>
      {booting && <KookaSplash hide={fadeOut} />}

      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* App Routes (share the nav menu) */}
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/recipe/:id" element={<Recipe />} />
          <Route path="/recipe/:id/cook" element={<Cook />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
