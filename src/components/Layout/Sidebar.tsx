import { Link, useLocation } from 'react-router-dom';
import { Shield, Lock, Search, Trash2, AlertTriangle, Eye, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { name: 'Access Lock', path: '/lock', icon: Lock },
    { name: 'Site Detector', path: '/detector', icon: Search },
    { name: 'Quarantine', path: '/quarantine', icon: Trash2 },
    { name: 'DOM Inspector', path: '/dom', icon: Eye },
    { name: 'Cookie Audit', path: '/cookies', icon: AlertTriangle },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen glass-panel sticky top-0 left-0 z-50">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 p-2 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          SecureShield
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 mb-4 px-3 uppercase tracking-wider">
          Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group',
                isActive 
                  ? 'bg-blue-600 text-white shadow-[0_5px_20px_rgba(37,99,235,0.3)] translate-x-1' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400'
              )}
            >
              <Icon className={clsx("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
              <span className="font-medium">{item.name}</span>
              {isActive && <Activity className="w-4 h-4 ml-auto animate-pulse text-blue-200" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}