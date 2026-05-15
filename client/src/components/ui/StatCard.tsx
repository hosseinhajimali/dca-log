interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
  className?: string;
}

export function StatCard({ label, value, sub, positive, negative, className = '' }: StatCardProps) {
  const subColor = positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-gray-500';

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${className}`}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-100 mt-1.5 font-mono">{value}</p>
      {sub && <p className={`text-sm mt-1 font-medium ${subColor}`}>{sub}</p>}
    </div>
  );
}
