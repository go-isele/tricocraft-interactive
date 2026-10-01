'use client';

import Link from 'next/link';

const NAV_BY_ROLE = {
  client: [
    { label: 'Marketplace', items: [
      { href: '/marketplace', key: 'catalogue', icon: '⊞', label: 'Product Catalogue' },
      { href: '/marketplace/custom-brief', key: 'custom', icon: '◈', label: 'Custom Brief' },
      { href: '/marketplace/cart', key: 'cart', icon: '🛒', label: 'Cart' },
    ] },
    { label: 'My Orders', items: [
      { href: '/marketplace/orders', key: 'orders', icon: '📦', label: 'Active & History' },
    ] },
    { label: 'Assets', items: [
      { href: '/marketplace/brand-vault', key: 'vault', icon: '◉', label: 'Brand Vault' },
    ] },
  ],
  admin: [
    { label: 'Overview', items: [
      { href: '/admin', key: 'dashboard', icon: '⊡', label: 'Dashboard' },
      { href: '/admin/orders', key: 'orders', icon: '📦', label: 'All Orders' },
    ] },
    { label: 'Manage', items: [
      { href: '/admin/catalogue', key: 'catalogue', icon: '⊞', label: 'Catalogue & Providers' },
      { href: '/admin/clients', key: 'clients', icon: '🏢', label: 'Corporate Accounts' },
      { href: '/admin/fx-rates', key: 'fx', icon: '💱', label: 'FX Rates' },
      { href: '/admin/blog', key: 'blog', icon: '✎', label: 'Resources / Blog' },
    ] },
  ],
  vendor: [
    { label: 'Production', items: [
      { href: '/vendor', key: 'orders', icon: '🏭', label: 'Assigned Orders' },
    ] },
  ],
};

const SUB_BY_ROLE = { client: 'Production Marketplace', admin: 'Admin', vendor: 'Vendor Portal' };

export default function DashSidebar({ role = 'client', active }) {
  const sections = NAV_BY_ROLE[role] || NAV_BY_ROLE.client;
  return (
    <aside className="dash-sidebar">
      <Link href="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/img/triocraft-icon.svg" className="brand-mark" alt="TrioCraft" />
        <div>
          <div className="brand-name" style={{ fontSize: 16 }}>TrioCraft</div>
          <div className="brand-sub" style={{ fontSize: 9.5 }}>{SUB_BY_ROLE[role]}</div>
        </div>
      </Link>
      {sections.map((section) => (
        <div className="nav-section" key={section.label}>
          <div className="nav-lbl">{section.label}</div>
          {section.items.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${active === item.key ? 'active' : ''}`}>
              <span className="nav-ico">{item.icon}</span> {item.label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
