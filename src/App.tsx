import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Spinner } from './components/Spinner';
import { Button } from './components/Button';
import { useAuth } from './context/AuthContext';
import { MaliciousSiteDetector } from './pages/SiteDetector';
import { ThreatQuarantine } from './pages/Quarantine';
import { DOMContentInspection } from './pages/DOMInspector';
import { CookieSecurityAudit } from './pages/CookieAudit';
import { WebAccessLock } from './pages/WebAccessLock';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthGoogleCallback } from './pages/AuthGoogleCallback';
import { Profile } from './pages/Profile';
import { cn } from './utils/cn';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const { user, logout } = useAuth();
  const profileName = user?.displayName || user?.email || 'Profile';
  const profileSubtitle = user?.timezone ? `${user.timezone}` : user?.email || '';
  const avatarSrc = user?.avatarUrl || '/icons/icon128.png';
  return (
    <Router>
      <div className="fixed inset-0 w-screen h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/20 overflow-hidden">
        {user && (
          <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100 flex-shrink-0">
            <div className="px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <img src="/icons/icon128.png" alt="SecureShield Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg" />
                  <div>
                    <h1 className="text-base sm:text-xl font-bold text-gray-900">SecureShield</h1>
                    <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Browser Security Suite</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-semibold text-gray-900">{profileName}</span>
                    <span className="text-xs text-gray-500">{profileSubtitle}</span>
                  </div>
                  <Link
                    to="/profile"
                    className="relative inline-flex h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-transparent hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <img src={avatarSrc} alt="Open profile" className="h-full w-full rounded-full object-cover" />
                    <span className="sr-only">Open profile</span>
                  </Link>
                  <Button size="sm" variant="secondary" className="text-xs sm:text-sm" onClick={logout}>
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </header>
        )}

        <div className={cn('flex-1 flex overflow-hidden', user ? 'flex-col md:flex-row' : '')}>
          {user && (
            <aside className="w-full md:w-64 bg-white/95 backdrop-blur-md border-b md:border-b-0 md:border-r border-gray-100 shadow-sm flex-shrink-0 overflow-y-auto">
              <Navigation />
            </aside>
          )}

          <main className="flex-1 overflow-y-auto px-4 py-4 sm:py-6 md:px-8 bg-mesh-gradient">
              <Routes>
                <Route path="/" element={<Navigate to={user ? '/wal' : '/login'} replace />} />
                <Route path="/login" element={user ? <Navigate to="/wal" replace /> : <Login />} />
                <Route path="/register" element={user ? <Navigate to="/wal" replace /> : <Register />} />
                <Route path="/auth/google" element={<AuthGoogleCallback />} />
                <Route
                  path="/wal"
                  element={
                    <ProtectedRoute>
                      <WebAccessLock />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/detect"
                  element={
                    <ProtectedRoute>
                      <MaliciousSiteDetector />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quarantine"
                  element={
                    <ProtectedRoute>
                      <ThreatQuarantine />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dom"
                  element={
                    <ProtectedRoute>
                      <DOMContentInspection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cookies"
                  element={
                    <ProtectedRoute>
                      <CookieSecurityAudit />
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
                {/* Redirect old /auth route to /login */}
                <Route path="/auth" element={<Navigate to="/login" replace />} />
                {/* Catch-all: redirect unknown routes */}
                <Route path="*" element={<Navigate to={user ? '/wal' : '/login'} replace />} />
              </Routes>
            </main>
          </div>
      </div>
    </Router>
  );
}

export default App;