interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
}

const variants = {
  green:  'bg-green-500/10 text-green-400 border-green-500/20',
  red:    'bg-red-500/10 text-red-400 border-red-500/20',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  gray:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}
