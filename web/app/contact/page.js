import { INTERNAL_API_URL } from '@/lib/api';
import ContactForm from '@/components/ContactForm';

export const metadata = { title: 'Contact — TrioCraft' };

async function getSiteConfig() {
  const res = await fetch(`${INTERNAL_API_URL}/api/site-config`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function ContactPage() {
  const config = await getSiteConfig();
  const site = config?.site;
  if (!site) return null;

  return (
    <div className="contact-grid">
      <div className="contact-info">
        <div className="eyebrow" style={{ marginBottom: 14 }}>⬡ Get in Touch</div>
        <h2>Let&rsquo;s talk about your space, event, or brand.</h2>
        <p style={{ color: 'var(--slate-lt)', fontSize: 14, marginBottom: 24 }}>We typically reply within one business day.</p>

        <div className="contact-line"><span className="ico">📍</span><span>{site.address}</span></div>
        <div className="contact-line"><span className="ico">📞</span><span><a href={`tel:${site.phonePrimaryTel}`}>{site.phoneDisplay}</a></span></div>
        <div className="contact-line"><span className="ico">✉</span><span><a href={`mailto:${site.email}`}>{site.email}</a></span></div>
        <div className="contact-line"><span className="ico">🕑</span><span>{site.hours}</span></div>

        <a className="wa-cta" href={site.whatsappLink} target="_blank" rel="noopener">💬 Chat with us on WhatsApp</a>

        <div style={{ display: 'flex', gap: 16, margin: '18px 0 4px' }}>
          <a href={site.social?.instagram} target="_blank" rel="noopener" style={{ color: 'var(--slate)', fontWeight: 600, fontSize: 13 }}>Instagram</a>
          <a href={site.social?.facebook} target="_blank" rel="noopener" style={{ color: 'var(--slate)', fontWeight: 600, fontSize: 13 }}>Facebook</a>
          <a href={site.social?.tiktok} target="_blank" rel="noopener" style={{ color: 'var(--slate)', fontWeight: 600, fontSize: 13 }}>TikTok</a>
        </div>

        <div className="map-embed">
          <iframe src={site.mapsEmbedSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="TrioCraft location — Emperor Plaza, Koinange Street, Nairobi" />
        </div>
      </div>

      <ContactForm />
    </div>
  );
}
