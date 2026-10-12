import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Signin from './pages/Signin.jsx'
import Signup from './pages/Signup.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import Dashboard from './pages/Dashboard.jsx'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App