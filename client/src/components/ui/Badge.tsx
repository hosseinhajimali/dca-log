interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
  size?: 'sm' | 'md';
}

const variants = {
  green:  'bg-green-500/10 text-green-400 border-green-500/20',
  red:    'bg-red-500/10 text-red-400 border-red-500/20',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  gray:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const sizes = {
  sm: 'px-1.5 py-px text-[10px] font-medium tracking-wide',
  md: 'px-2 py-0.5 text-xs font-medium',
};

export function Badge({ children, variant = 'gray', size = 'md' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md border ${sizes[size]} ${variants[variant]}`}>
      {children}
    </span>
  );
}
