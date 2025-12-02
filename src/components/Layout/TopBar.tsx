import { useAuth } from '../../context/AuthContext';
import { User, Moon, Sun, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export function TopBar() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <header className="glass-panel sticky top-0 z-40 px-6 py-3 flex justify-between items-center md:ml-0">
      {/* Mobile Title for Extension Popup Mode */}
      <div className="md:hidden flex items-center gap-2">
         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
         <span className="font-bold text-slate-700 dark:text-white">SecureShield</span>
      </div>

      <div className="flex-1"></div> {/* Spacer */}

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-transform hover:rotate-90"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user?.email}</p>
            <p className="text-xs text-blue-500">Premium Guard</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}