import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Spinner } from './components/Spinner';
import { Button } from './components/Button';
import { useAuth } from './context/AuthContext';
import { MaliciousSiteDetector } from './pages/MaliciousSiteDetector';
import { ThreatQuarantine } from './pages/ThreatQuarantine';
import { DOMContentInspection } from './pages/DOMContentInspection';
import { CookieSecurityAudit } from './pages/CookieSecurityAudit';
import { AuthPage } from './pages/Auth';
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
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  const { user, logout } = useAuth();
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/20">
        <div className="max-w-6xl mx-auto">
          {user && (
            <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src="/icons/icon128.png" alt="SecureShield Logo" className="w-8 h-8 rounded-lg" />
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">SecureShield</h1>
                      <p className="text-sm text-gray-600">Browser Security Suite</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{user.email}</p>
                    <Button size="sm" variant="secondary" className="mt-1" onClick={logout}>
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
            </header>
          )}

          <div className={cn('min-h-screen', user ? 'flex flex-col md:flex-row' : '')}>
            {user && (
              <aside className="md:w-64 bg-white/95 backdrop-blur-md border-b border-gray-100 md:border-b-0 md:border-r shadow-sm">
                <Navigation />
              </aside>
            )}

            <main className="flex-1 px-4 py-6 md:px-8 bg-mesh-gradient">
              <Routes>
                {/* Default route now points to /detect since WebAccessLock module removed */}
                <Route path="/" element={<Navigate to={user ? '/detect' : '/auth'} replace />} />
                <Route path="/auth" element={user ? <Navigate to="/detect" replace /> : <AuthPage />} />
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
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;