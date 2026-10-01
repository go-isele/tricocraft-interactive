import Link from 'next/link';

export default function SiteFooter({ site }) {
  if (!site) return null;
  return (
    <footer className="site-ftr">
      <div className="container">
        <div className="row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/img/triocraft-icon.svg" className="brand-mark" alt="TrioCraft" />
              <div className="brand-name">TrioCraft</div>
            </div>
            <div className="tagline">&ldquo;{site.tagline}&rdquo;</div>
            <p style={{ fontSize: 13, maxWidth: 280, color: 'rgba(255,255,255,.55)', marginBottom: 14 }}>
              Transforming physical spaces into immersive brand experiences — Nairobi-based, delivered through a curated production network.
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.9 }}>
              📍 {site.address}<br />
              📞 <a href={`tel:${site.phonePrimaryTel}`} style={{ color: 'inherit' }}>{site.phoneDisplay}</a><br />
              ✉ <a href={`mailto:${site.email}`} style={{ color: 'inherit' }}>{site.email}</a><br />
              <a href={site.whatsappLink} target="_blank" rel="noopener" style={{ color: '#25D366', fontWeight: 600 }}>💬 Chat on WhatsApp</a>
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              <a href={site.social?.instagram} target="_blank" rel="noopener" aria-label="Instagram" style={{ color: 'rgba(255,255,255,.7)' }}>Instagram</a>
              <a href={site.social?.facebook} target="_blank" rel="noopener" aria-label="Facebook" style={{ color: 'rgba(255,255,255,.7)' }}>Facebook</a>
              <a href={site.social?.tiktok} target="_blank" rel="noopener" aria-label="TikTok" style={{ color: 'rgba(255,255,255,.7)' }}>TikTok</a>
            </div>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              <li><Link href="/services/graphic-design-creative">Graphic Design &amp; Creative</Link></li>
              <li><Link href="/marketplace?category=apparel-wearable-branding">Apparel &amp; Wearable Branding</Link></li>
              <li><Link href="/marketplace?category=large-format-environmental">Large Format &amp; Environmental</Link></li>
              <li><Link href="/marketplace?category=event-branding-activation">Event Branding &amp; Activation</Link></li>
              <li><Link href="/services">View All 11 Service Categories →</Link></li>
            </ul>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li><Link href="/work">Our Work</Link></li>
              <li><Link href="/marketplace">Product Catalogue</Link></li>
              <li><Link href="/marketplace/custom-brief">Custom Brief</Link></li>
              <li><Link href="/resources">Resources</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/register">Create an Account</Link></li>
              <li><Link href="/login">Log In</Link></li>
            </ul>
          </div>
        </div>
        <div className="bottom">
          <span>© {new Date().getFullYear()} TrioCraft Brands Ltd. All rights reserved.</span>
          <span><Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link> · Nairobi, Kenya</span>
        </div>
      </div>
    </footer>
  );
}
