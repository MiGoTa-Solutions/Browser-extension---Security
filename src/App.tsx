import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { WebAccessLock } from './pages/WebAccessLock';
import { MaliciousSiteDetector } from './pages/MaliciousSiteDetector';
import { ThreatQuarantine } from './pages/ThreatQuarantine';
import { DOMContentInspection } from './pages/DOMContentInspection';
import { CookieSecurityAudit } from './pages/CookieSecurityAudit';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <header className="bg-white shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">SS</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">SecureShield</h1>
                    <p className="text-sm text-gray-600">Browser Security Suite</p>
                  </div>
                </div>
              </div>
            </div>
            <Navigation />
          </header>

          <main className="min-h-screen">
            <Routes>
              <Route path="/" element={<Navigate to="/wal" replace />} />
              <Route path="/wal" element={<WebAccessLock />} />
              <Route path="/detect" element={<MaliciousSiteDetector />} />
              <Route path="/quarantine" element={<ThreatQuarantine />} />
              <Route path="/dom" element={<DOMContentInspection />} />
              <Route path="/cookies" element={<CookieSecurityAudit />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;