// MalMind's palette on the phone — the website's dark-mode tokens, so both
// surfaces feel like one product. The app is dark-only (app.json).

export const C = {
  bg: '#0E1411',
  card: '#161D19',
  card2: '#1C2520',
  border: '#27322C',
  borderFaint: '#202923',
  ink: '#F2F5F3',
  ink2: 'rgba(242,245,243,0.78)',
  muted: '#8A948E',
  green: '#1D9E75',
  greenText: '#5DCAA5',
  greenBg: 'rgba(29,158,117,0.14)',
  greenBorder: 'rgba(29,158,117,0.45)',
  red: '#E5615F',
  redBg: 'rgba(229,97,95,0.12)',
  gold: '#C9A84C',
  goldText: '#E5C86B',
  goldBg: 'rgba(201,168,76,0.12)',
  heroFrom: '#073626',
  heroTo: '#0A3A29',
  blue: '#3B6FD4',
  teal: '#17B8C9',
  amber: '#E0922A',
  purple: '#7A5EA8',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 } as const;
