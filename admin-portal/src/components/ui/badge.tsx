import { cn, getStatusColor } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

export function Badge({ children, variant, className }: BadgeProps) {
  const colorClass = variant ? getStatusColor(variant) : 'bg-gray-100 text-gray-800';
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {children}
    </span>
  );
}
