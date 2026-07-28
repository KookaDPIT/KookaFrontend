import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import AppLayout from './pages/app/AppLayout'
import Home from './pages/app/Home'
import Chat from './pages/app/Chat'
import Learn from './pages/app/Learn'
import Forum from './pages/app/Forum'
import Profile from './pages/app/Profile'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* App Routes (share the nav menu) */}
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
