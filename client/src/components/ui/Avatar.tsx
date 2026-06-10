// Premade avatar system, 6 tech + 6 finance personas

export type AvatarId =
  | 'coder' | 'terminal' | 'robot' | 'neural' | 'satellite' | 'atom'
  | 'bull' | 'diamond' | 'chart' | 'vault' | 'bitcoin' | 'hawk'
  | 'default';

export interface AvatarMeta {
  id: AvatarId;
  label: string;
  category: 'tech' | 'finance';
}

export const AVATAR_LIST: AvatarMeta[] = [
  { id: 'coder',     label: 'Coder',     category: 'tech' },
  { id: 'terminal',  label: 'Terminal',  category: 'tech' },
  { id: 'robot',     label: 'Robot',     category: 'tech' },
  { id: 'neural',    label: 'Neural',    category: 'tech' },
  { id: 'satellite', label: 'Satellite', category: 'tech' },
  { id: 'atom',      label: 'Atom',      category: 'tech' },
  { id: 'bull',      label: 'Bull',      category: 'finance' },
  { id: 'diamond',   label: 'Diamond',   category: 'finance' },
  { id: 'chart',     label: 'Chart',     category: 'finance' },
  { id: 'vault',     label: 'Vault',     category: 'finance' },
  { id: 'bitcoin',   label: 'Bitcoin',   category: 'finance' },
  { id: 'hawk',      label: 'Hawk',      category: 'finance' },
];

const BG: Record<AvatarId, string> = {
  coder:     '#1d4ed8',
  terminal:  '#0f172a',
  robot:     '#0f766e',
  neural:    '#6d28d9',
  satellite: '#c2410c',
  atom:      '#0369a1',
  bull:      '#b91c1c',
  diamond:   '#4338ca',
  chart:     '#047857',
  vault:     '#b45309',
  bitcoin:   '#d97706',
  hawk:      '#334155',
  default:   '#374151',
};

function Icon({ id }: { id: AvatarId }) {
  switch (id) {
    case 'coder':
      return (
        <text x="20" y="27" textAnchor="middle" fill="white"
          fontFamily="'Courier New', monospace" fontSize="13" fontWeight="900">
          {'</>'}
        </text>
      );

    case 'terminal':
      return (
        <>
          <rect x="8" y="11" width="24" height="18" rx="2.5" fill="none"
            stroke="#2ed794" strokeWidth="1.5" />
          <circle cx="12" cy="15" r="1.2" fill="#f8657a" />
          <circle cx="16" cy="15" r="1.2" fill="#fbbf24" />
          <circle cx="20" cy="15" r="1.2" fill="#2ed794" />
          <text x="10" y="26" fill="#2ed794" fontFamily="monospace" fontSize="9" fontWeight="700">
            {'$ _'}
          </text>
        </>
      );

    case 'robot':
      return (
        <>
          <line x1="20" y1="7" x2="20" y2="12" stroke="white" strokeWidth="1.5" />
          <circle cx="20" cy="6" r="2" fill="white" />
          <rect x="11" y="12" width="18" height="17" rx="3" fill="none"
            stroke="white" strokeWidth="1.5" />
          <rect x="14" y="17" width="4" height="4" rx="1" fill="white" />
          <rect x="22" y="17" width="4" height="4" rx="1" fill="white" />
          <rect x="14" y="24" width="12" height="2" rx="1" fill="white" fillOpacity="0.7" />
          <line x1="11" y1="21" x2="8" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="29" y1="21" x2="32" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );

    case 'neural':
      return (
        <>
          <line x1="12" y1="14" x2="20" y2="20" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
          <line x1="28" y1="14" x2="20" y2="20" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
          <line x1="12" y1="26" x2="20" y2="20" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
          <line x1="28" y1="26" x2="20" y2="20" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
          <line x1="12" y1="14" x2="12" y2="26" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <line x1="28" y1="14" x2="28" y2="26" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <line x1="12" y1="14" x2="28" y2="26" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="28" y1="14" x2="12" y2="26" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="12" cy="14" r="3.5" fill="white" fillOpacity="0.85" />
          <circle cx="28" cy="14" r="3.5" fill="white" fillOpacity="0.85" />
          <circle cx="20" cy="20" r="4.5" fill="white" />
          <circle cx="12" cy="26" r="3.5" fill="white" fillOpacity="0.85" />
          <circle cx="28" cy="26" r="3.5" fill="white" fillOpacity="0.85" />
        </>
      );

    case 'satellite':
      return (
        <>
          <path d="M 9 30 Q 13 17 25 13" stroke="white" strokeWidth="2"
            fill="none" strokeLinecap="round" />
          <path d="M 9 30 Q 21 28 25 13" stroke="white" strokeWidth="2"
            fill="none" strokeLinecap="round" />
          <line x1="9" y1="30" x2="25" y2="13" stroke="white"
            strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="9" cy="30" r="2.5" fill="white" />
          <path d="M 26 11 Q 31 13 30 19" stroke="white" strokeWidth="1.5"
            fill="none" strokeLinecap="round" strokeOpacity="0.9" />
          <path d="M 28 8 Q 35 11 34 21" stroke="white" strokeWidth="1.5"
            fill="none" strokeLinecap="round" strokeOpacity="0.5" />
        </>
      );

    case 'atom':
      return (
        <>
          <ellipse cx="20" cy="20" rx="13" ry="5" fill="none"
            stroke="white" strokeWidth="1.5" strokeOpacity="0.9" />
          <ellipse cx="20" cy="20" rx="13" ry="5" fill="none"
            stroke="white" strokeWidth="1.5" strokeOpacity="0.6"
            transform="rotate(60 20 20)" />
          <ellipse cx="20" cy="20" rx="13" ry="5" fill="none"
            stroke="white" strokeWidth="1.5" strokeOpacity="0.4"
            transform="rotate(120 20 20)" />
          <circle cx="20" cy="20" r="3.5" fill="white" />
        </>
      );

    case 'bull':
      return (
        <>
          <path d="M 14 19 Q 7 11 11 7" stroke="white" strokeWidth="2.5"
            fill="none" strokeLinecap="round" />
          <path d="M 26 19 Q 33 11 29 7" stroke="white" strokeWidth="2.5"
            fill="none" strokeLinecap="round" />
          <circle cx="20" cy="23" r="10" fill="white" fillOpacity="0.15"
            stroke="white" strokeWidth="1.5" />
          <circle cx="16" cy="21" r="2.5" fill="white" />
          <circle cx="24" cy="21" r="2.5" fill="white" />
          <ellipse cx="20" cy="28" rx="5" ry="3" fill="white" fillOpacity="0.2"
            stroke="white" strokeWidth="1.2" />
          <circle cx="18" cy="28" r="1.2" fill="white" fillOpacity="0.8" />
          <circle cx="22" cy="28" r="1.2" fill="white" fillOpacity="0.8" />
        </>
      );

    case 'diamond':
      return (
        <>
          <polygon points="20,8 32,20 20,32 8,20" fill="white" fillOpacity="0.18"
            stroke="white" strokeWidth="1.5" />
          <line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="20" y1="8" x2="8" y2="20" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <line x1="20" y1="8" x2="32" y2="20" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
          <line x1="13" y1="14" x2="27" y2="14" stroke="white" strokeWidth="1" strokeOpacity="0.25" />
          <polygon points="20,10 30,19 20,30 10,19" fill="white" fillOpacity="0.08" />
        </>
      );

    case 'chart':
      return (
        <>
          <rect x="8" y="25" width="5" height="7" rx="1" fill="white" fillOpacity="0.45" />
          <rect x="16" y="19" width="5" height="13" rx="1" fill="white" fillOpacity="0.65" />
          <rect x="24" y="12" width="5" height="20" rx="1" fill="white" fillOpacity="0.85" />
          <polyline points="10.5,24 18.5,18 26.5,11" stroke="white" strokeWidth="2"
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="26.5" cy="11" r="2.5" fill="white" />
          <line x1="7" y1="33" x2="33" y2="33" stroke="white" strokeWidth="1.2"
            strokeOpacity="0.3" strokeLinecap="round" />
        </>
      );

    case 'vault':
      return (
        <>
          <circle cx="20" cy="20" r="13" fill="none" stroke="white"
            strokeWidth="2" strokeOpacity="0.8" />
          <circle cx="20" cy="20" r="7" fill="none" stroke="white"
            strokeWidth="1.5" strokeOpacity="0.5" />
          <line x1="20" y1="7" x2="20" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="30" x2="20" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="7" y1="20" x2="10" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="20" x2="33" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="20" x2="25" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2.5" fill="white" />
        </>
      );

    case 'bitcoin':
      return (
        <text x="20" y="28" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">
          ₿
        </text>
      );

    case 'hawk':
      return (
        <>
          <path d="M 20 19 Q 11 13 6 17 Q 10 19 13 21 Q 9 23 8 27 Q 14 25 20 23"
            fill="white" fillOpacity="0.9" />
          <path d="M 20 19 Q 29 13 34 17 Q 30 19 27 21 Q 31 23 32 27 Q 26 25 20 23"
            fill="white" fillOpacity="0.9" />
          <ellipse cx="20" cy="23" rx="3" ry="5" fill="white" />
          <circle cx="20" cy="16" r="4" fill="white" />
          <path d="M 22 15.5 L 26 16.5 L 22 17.5" fill="white" fillOpacity="0.6" />
          <circle cx="18.5" cy="15" r="1" fill="#0f172a" />
        </>
      );

    default:
      return (
        <text x="20" y="27" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
          ?
        </text>
      );
  }
}

interface AvatarProps {
  id?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ id, size = 40, className = '' }: AvatarProps) {
  // Custom uploaded image (data URL or remote URL)
  if (id && (id.startsWith('data:') || id.startsWith('http') || id.startsWith('/'))) {
    return (
      <img
        src={id}
        width={size}
        height={size}
        className={`rounded-full flex-shrink-0 object-cover ${className}`}
        style={{ width: size, height: size }}
        alt="avatar"
      />
    );
  }

  const avatarId = (id as AvatarId) || 'default';
  const bg = BG[avatarId] ?? BG.default;

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={`rounded-full flex-shrink-0 ${className}`}
      style={{ background: bg }}
    >
      <Icon id={avatarId} />
    </svg>
  );
}
