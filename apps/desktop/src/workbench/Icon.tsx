type IconName = 'case' | 'conversation' | 'panels' | 'compare' | 'stack' | 'columns' | 'reset' | 'settings' | 'plus' | 'minus' | 'fit';

const paths: Record<IconName, React.ReactNode> = {
  case: <><path d="M3.5 6.5h17v12h-17z" /><path d="M7 6.5V4.2h6l2 2.3" /></>,
  conversation: <><path d="M4 5h16v11H9l-4 3v-3H4z" /><path d="M8 9h8M8 12h5" /></>,
  panels: <><rect x="3.5" y="4" width="17" height="16" rx="1.5" /><path d="M3.5 9h17M9 9v11" /></>,
  compare: <><rect x="3.5" y="4" width="17" height="16" rx="1.5" /><path d="M3.5 12h17" /></>,
  stack: <><rect x="4" y="3.5" width="16" height="17" rx="1.5" /><path d="M4 12h16" /></>,
  columns: <><rect x="4" y="3.5" width="16" height="17" rx="1.5" /><path d="M12 3.5v17" /></>,
  reset: <><path d="M5.5 8.5A7 7 0 1 1 5 15" /><path d="M5.5 4.5v4h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  fit: <><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /><rect x="8" y="8" width="8" height="8" rx="1" /></>,
};

export function Icon({ name }: { name: IconName }) {
  return <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
