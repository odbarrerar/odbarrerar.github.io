/** Main navigation. Change the order or labels here. */
export const NAV = [
  { href: '/research/', label: 'Research' },
  { href: '/publications/', label: 'Publications' },
  { href: '/cv/', label: 'CV' },
  { href: '/teaching/', label: 'Teaching' },
  { href: '/talks/', label: 'Talks' },
  { href: '/writing/', label: 'Writing' },
//  { href: '/code/', label: 'Code & Data' },
  { href: '/notes/', label: 'Notes' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
] as const;

export function isCurrent(pathname: string, href: string): boolean {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return path === href || path.startsWith(href);
}
