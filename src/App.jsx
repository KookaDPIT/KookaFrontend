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
import ForumPost from './pages/app/ForumPost'
import CreateForumPost from './pages/app/CreateForumPost'
import Profile from './pages/app/Profile'
import Settings from './pages/app/Settings'
import Admin from './pages/app/Admin'
import Suspended from './pages/app/Suspended'
import CreateRecipe from './pages/app/CreateRecipe'
import Search from './pages/app/Search'
import KookaSplash from './pages/loading/KookaSplash'
import { isLoggedIn } from './user'
import { readSettings, applyTheme } from './settings'
import './App.css'

/* Gate the app routes: no token → back to login. */
function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

// How long the splash stays up at minimum, so the gold-fill animation
// has time to play through even when the page loads instantly.
const SPLASH_MIN_MS = 1800
const SPLASH_FADE_MS = 550

function App() {
  const [booting, setBooting] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  /* The theme was only ever applied from inside AppLayout, so every screen
     outside the app shell — login, signup, the suspension wall — rendered with
     whatever happened to be on the root element. Apply it once at boot. */
  useEffect(() => {
    applyTheme(readSettings().theme);
  }, [])

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

        {/* Suspended accounts are pinned here — outside the app shell, since
            none of its navigation would work for them anyway. */}
        <Route
          path="/suspended"
          element={
            <ProtectedRoute>
              <Suspended />
            </ProtectedRoute>
          }
        />

        {/* App Routes (share the nav menu, require auth) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/create" element={<CreateRecipe />} />
          <Route path="/recipe/:id/edit" element={<CreateRecipe />} />
          <Route path="/search" element={<Search />} />
          <Route path="/recipe/:id" element={<Recipe />} />
          <Route path="/recipe/:id/cook" element={<Cook />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/forum" element={<Forum />} />
          {/* `new` is declared before `:id` so it is not read as a post id */}
          <Route path="/forum/new" element={<CreateForumPost />} />
          <Route path="/forum/:id" element={<ForumPost />} />
          <Route path="/forum/:id/edit" element={<CreateForumPost />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          {/* staff only — Admin itself redirects a plain user, and every
              /admin endpoint is guarded server-side regardless */}
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
