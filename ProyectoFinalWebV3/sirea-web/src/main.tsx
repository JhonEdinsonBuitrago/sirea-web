import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard'
import Navbar from './components/Navbar'
import AuthLoading from './components/AuthLoading'
import { AuthProvider, useAuth } from './context/AuthProvider'
import ProtectedRoute from './routes/ProtectedRoute'
import PublicRoute from './routes/PublicRoute'
import NewIncident from './pages/Incidents/NewIncident'
import AdminRoute from './routes/AdminRoute'
import AdminDashboard from './pages/Admin/AdminDashboard'
import IncidentsAdmin from './pages/Admin/IncidentsAdmin'
import IncidentDetail from './pages/Incidents/IncidentDetail'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Reports from './pages/Reports'
import Statistics from './pages/Statistics'
import ForgotPassword from './pages/Auth/ForgotPassword'
import NotFound from './pages/NotFound'
import { Toaster } from 'sonner'

function AppContent() {
  const location = useLocation();
  const hideSidebar = location.pathname === '/' || location.pathname.startsWith('/auth');
  const { loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className={hideSidebar ? 'min-w-0' : 'min-w-0 lg:ml-72'}>
        <div className="min-h-screen">
          <Toaster position="top-right" richColors closeButton toastOptions={{ className: 'max-w-[calc(100vw-2rem)]' }} />
          <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/auth/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/auth/register"
                  element={
                    <PublicRoute>
                      <Register />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/auth/forgot-password"
                  element={
                    <PublicRoute>
                      <ForgotPassword />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/incidents/new"
                  element={
                    <ProtectedRoute>
                      <NewIncident />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/incidents/:id"
                  element={
                    <ProtectedRoute>
                      <IncidentDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/statistics"
                  element={
                    <ProtectedRoute>
                      <Statistics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/incidents"
                  element={
                    <AdminRoute>
                      <IncidentsAdmin />
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

const container = document.getElementById('root')!;
// Avoid creating multiple roots during HMR (Vite fast refresh)
declare global {
  interface Window { __react_root?: any }
}

if (!(window as any).__react_root) {
  const root = createRoot(container);
  (window as any).__react_root = root;
  root.render(<App />);
} else {
  (window as any).__react_root.render(<App />);
}
