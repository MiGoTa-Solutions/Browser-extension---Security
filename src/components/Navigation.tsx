import { NavLink } from 'react-router-dom';
import { Shield, Lock, AlertTriangle, Eye, Cookie } from 'lucide-react';
import { cn } from '../utils/cn';

const navigationItems = [
  { path: '/wal', label: 'Web Access Lock', icon: Lock },
  { path: '/detect', label: 'Site Detector', icon: Shield },
  { path: '/quarantine', label: 'Quarantine', icon: AlertTriangle },
  { path: '/dom', label: 'DOM Inspector', icon: Eye },
  { path: '/cookies', label: 'Cookie Audit', icon: Cookie }
];

export function Navigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="flex overflow-x-auto">
        {navigationItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                isActive
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              )
            }
            aria-label={`Navigate to ${label}`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}