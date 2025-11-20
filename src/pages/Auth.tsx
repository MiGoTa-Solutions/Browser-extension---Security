import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, AlertTriangle, Cookie, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    pin: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register({
          email: formData.email,
          password: formData.password,
          pin: formData.pin || undefined,
        });
      }

      navigate('/wal', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: Lock, title: 'Web Access Lock', description: 'Control and restrict website access with PIN protection' },
    { icon: Shield, title: 'Malicious Site Detection', description: 'Real-time threat detection and blocking' },
    { icon: AlertTriangle, title: 'Threat Quarantine', description: 'Isolate and manage detected threats' },
    { icon: Eye, title: 'DOM Inspector', description: 'Analyze and inspect webpage content security' },
    { icon: Cookie, title: 'Cookie Security Audit', description: 'Monitor and audit cookie security' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 flex-col justify-center relative overflow-hidden h-screen">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-purple-300/30 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        {/* Mesh Grid */}
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>

        <div className="relative z-10">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 mb-8">
            <img src="/icons/icon128.png" alt="SecureShield" className="w-12 h-12 rounded-xl shadow-2xl" />
            <div>
              <h1 className="text-2xl font-bold text-white">SecureShield</h1>
              <p className="text-blue-200 text-sm">Browser Security Suite</p>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Comprehensive Protection</h2>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start space-x-3 text-white group transition-all hover:translate-x-2">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg group-hover:bg-white/30 transition-all group-hover:scale-110">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-0.5">{feature.title}</h3>
                    <p className="text-blue-100/90 text-xs leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mt-8">
          <p className="text-blue-100 text-xs">© 2025 SecureShield. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient"></div>
        <div className="w-full max-w-md overflow-y-auto max-h-screen py-4">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/icons/icon128.png" alt="SecureShield" className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-lg" />
            <h1 className="text-2xl font-bold text-gray-900">SecureShield</h1>
            <p className="text-gray-600">Browser Security Suite</p>
          </div>

          {/* Auth Card */}
          <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-gray-600">
                {mode === 'login' 
                  ? 'Sign in to access your security dashboard' 
                  : 'Get started with SecureShield protection'}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email address"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                required
                autoComplete="email"
                className="transition-all"
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                required
                helperText={mode === 'register' ? 'Minimum 8 characters' : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="transition-all"
              />

              {mode === 'register' && (
                <>
                  <Input
                    label="Confirm password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    required
                    autoComplete="new-password"
                    className="transition-all"
                  />
                  <Input
                    label="Security PIN (Optional)"
                    type="password"
                    value={formData.pin}
                    onChange={(event) => setFormData((prev) => ({ ...prev, pin: event.target.value }))}
                    helperText="Required for Web Access Lock features"
                    maxLength={12}
                    autoComplete="off"
                    className="transition-all"
                  />
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                loading={isSubmitting} 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
              >
                {mode === 'login' ? 'Sign in' : 'Create account'}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                {mode === 'login' ? (
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    onClick={() => setMode('register')}
                  >
                    Don't have an account? <span className="underline">Sign up</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    onClick={() => setMode('login')}
                  >
                    Already have an account? <span className="underline">Sign in</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-1">
                <Lock className="w-4 h-4" />
                <span>Encrypted</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>Private</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
