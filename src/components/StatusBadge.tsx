import { cn } from '../utils/cn';

interface StatusBadgeProps {
  status: 'safe' | 'suspicious' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function StatusBadge({ status, size = 'md', label }: StatusBadgeProps) {
  const statusConfig = {
    safe: {
      label: label || 'Safe',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    suspicious: {
      label: label || 'Suspicious',
      className: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    danger: {
      label: label || 'Danger',
      className: 'bg-red-100 text-red-800 border-red-200'
    }
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  };
  
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.className,
        sizeClasses[size]
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span
        className={cn(
          'w-2 h-2 mr-1.5 rounded-full',
          status === 'safe' && 'bg-green-600',
          status === 'suspicious' && 'bg-orange-600',
          status === 'danger' && 'bg-red-600'
        )}
      />
      {config.label}
    </span>
  );
}