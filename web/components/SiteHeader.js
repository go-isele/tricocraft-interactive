'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import CurrencySwitcher from './CurrencySwitcher';

const NAV = [
  { href: '/work', label: 'Work' },
  { href: '/services', label: 'Services' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/resources', label: 'Resources' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteHeader({ site }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <header className="site-hdr">
      <div className="container row">
        <Link href="/" className="brand">
          <img src="/img/triocraft-icon.svg" className="brand-mark" alt="TrioCraft" />
          <div>
            <div className="brand-name">TrioCraft</div>
            <div className="brand-sub">Crafting Dreams, Forged in Brotherhood</div>
          </div>
        </Link>
        <nav className="site-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href)) ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hdr-actions">
          <CurrencySwitcher />
          {site?.whatsappLink && (
            <a className="hdr-wa-link" href={site.whatsappLink} target="_blank" rel="noopener" title="Chat on WhatsApp">
              <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M16.02 3C9.4 3 4 8.36 4 15c0 2.34.64 4.53 1.75 6.4L3 29l7.8-2.68A11.9 11.9 0 0 0 16.02 27C22.63 27 28 21.64 28 15S22.63 3 16.02 3Z" />
              </svg>
            </a>
          )}
          {user ? (
            <Link
              className="hdr-user-pill"
              href={user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/marketplace'}
            >
              <span className="hdr-av">{user.name.charAt(0)}</span> {user.name.split(' ')[0]}
            </Link>
          ) : (
            <>
              <Link className="btn btn-outline btn-sm" href="/login">Log In</Link>
              <Link className="btn btn-primary btn-sm" href="/register">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
