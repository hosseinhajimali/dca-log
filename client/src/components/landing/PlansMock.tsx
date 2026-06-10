import { Badge } from '@/components/ui/Badge';

const TD = 'px-3 py-2.5 text-sm';
const TH = 'px-3 py-2.5 text-xs text-gray-500 uppercase tracking-wider font-medium text-left';

const RULE_SETS = [
  {
    label: 'Standard',
    isDefault: true,
    total: '$200.00',
    fires: true,
    perAsset: [
      { symbol: 'BTC', color: '#f7931a', drawdown: '-51.2%', suggestion: '2x $100.00', fires: true },
      { symbol: 'ETH', color: '#627eea', drawdown: '-66.9%', suggestion: '2x $100.00', fires: true },
    ],
  },
  {
    label: 'Deep dip only',
    isDefault: false,
    total: '$150.00',
    fires: false,
    perAsset: [
      { symbol: 'BTC', color: '#f7931a', drawdown: '-51.2%', suggestion: '1.5x $75.00', fires: false },
      { symbol: 'ETH', color: '#627eea', drawdown: '-66.9%', suggestion: '1.5x $75.00', fires: false },
    ],
  },
];

export function PlansMock() {
  return (
    <div className="p-4 sm:p-6 bg-gray-950" aria-hidden="true">
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <span className="font-mono font-bold" style={{ color: '#f7931a' }}>BTC</span>
        <span className="text-gray-600">50%</span>
        <span className="text-gray-600">·</span>
        <span className="font-mono font-bold" style={{ color: '#627eea' }}>ETH</span>
        <span className="text-gray-600">50%</span>
        <span className="text-gray-500">(Main plan)</span>
        <Badge variant="blue">Weekly</Badge>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between flex-wrap px-5 py-3.5 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300">Buying rules</h3>
          <span className="text-xs text-brand-400">+ Add rule set</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className={TH}>Label</th>
                <th className={TH}>Per asset</th>
                <th className={TH}>Total</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {RULE_SETS.map((rs) => (
                <tr key={rs.label} className="border-b border-gray-700 last:border-0">
                  <td className={TD}>
                    <span className="text-gray-200">{rs.label}</span>
                  </td>
                  <td className={TD}>
                    <div className="space-y-0.5">
                      {rs.perAsset.map((a) => (
                        <div key={a.symbol} className="flex items-center gap-1.5 text-xs font-mono">
                          <span style={{ color: a.color }} className="font-medium">{a.symbol}</span>
                          <span className="text-red-400">{a.drawdown}</span>
                          <span className="text-gray-600">&rarr;</span>
                          <span className={a.fires ? 'text-brand-300 font-semibold whitespace-nowrap' : 'text-gray-500 whitespace-nowrap'}>
                            {a.suggestion}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className={`${TD} font-mono font-semibold ${rs.fires ? 'text-brand-300' : 'text-gray-600'}`}>
                    {rs.total}
                  </td>
                  <td className={`${TD} text-right`}>
                    {rs.isDefault ? (
                      <Badge variant="green">default</Badge>
                    ) : (
                      <span className="text-xs text-gray-500">Set default</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
