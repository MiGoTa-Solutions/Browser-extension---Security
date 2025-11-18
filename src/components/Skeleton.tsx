import { cn } from '../utils/cn';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  if (lines === 1) {
    return (
      <div
        className={cn('animate-pulse bg-gray-200 rounded', className)}
        aria-label="Loading content"
      />
    );
  }
  
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse bg-gray-200 rounded h-4',
            i === lines - 1 && 'w-3/4',
            className
          )}
          aria-label="Loading content"
        />
      ))}
    </div>
  );
}