import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Lock, AlertTriangle, Eye, Cookie, Menu, X, UserCircle } from 'lucide-react';
import { cn } from '../utils/cn';

const navigationItems = [
  { path: '/wal', label: 'Web Access Lock', icon: Lock },
  { path: '/detect', label: 'Site Detector', icon: Shield },
  { path: '/quarantine', label: 'Quarantine', icon: AlertTriangle },
  { path: '/dom', label: 'DOM Inspector', icon: Eye },
  { path: '/cookies', label: 'Cookie Audit', icon: Cookie },
  { path: '/profile', label: 'Profile & Settings', icon: UserCircle }
];

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleToggle = () => setIsMenuOpen((prev) => !prev);
  const handleNavClick = () => setIsMenuOpen(false);

  return (
    <nav className="bg-white border-b border-gray-200 md:border-b-0 md:border-r h-full">
      {/* Mobile Menu Toggle */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-700">Menu</p>
        <button
          type="button"
          onClick={handleToggle}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div
        className={cn(
          'md:flex md:flex-col md:space-y-1 md:p-2 md:overflow-visible',
          'transition-all duration-200 ease-in-out bg-white',
          isMenuOpen ? 'flex flex-col border-b border-gray-100' : 'hidden md:flex'
        )}
      >
        {navigationItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                'flex items-center px-4 py-3 text-sm font-medium border-b-2 md:border-b-0 md:border-l-4 transition-all duration-300 ease-out whitespace-nowrap',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                'hover:pl-5 md:hover:pl-6',
                isActive
                  ? 'text-blue-600 border-blue-600 md:border-blue-600 bg-blue-50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 md:hover:border-gray-200 hover:bg-gray-50'
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