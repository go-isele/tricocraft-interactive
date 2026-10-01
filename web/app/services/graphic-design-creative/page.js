import Link from 'next/link';
import { INTERNAL_API_URL } from '@/lib/api';

export const metadata = {
  title: 'Graphic Design & Creative — TrioCraft Brands Ltd',
  description: "Logo & brand identity, brand guidelines, illustration, social media content, and packaging/print design — TrioCraft Brands Ltd's Graphic Design & Creative category.",
};

async function getData() {
  const res = await fetch(`${INTERNAL_API_URL}/api/services/graphic-design-creative`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load page data');
  return res.json();
}
async function getSiteConfig() {
  const res = await fetch(`${INTERNAL_API_URL}/api/site-config`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function GraphicDesignPage() {
  const [{ page, productsBySlug, caseStudy }, config] = await Promise.all([getData(), getSiteConfig()]);
  const site = config?.site;

  return (
    <>
      <section className="hero" style={{ padding: '56px 0 40px' }}>
        <div className="container">
          <div className="eyebrow">⬡ Graphic Design &amp; Creative</div>
          <h1 style={{ fontSize: 38 }}>Every brand decision starts on this page.</h1>
          <p className="lede">Logo &amp; identity, brand guidelines, illustration, social content, and packaging/print design — designed in-house, then handed straight into TrioCraft&rsquo;s own production lines when it&rsquo;s ready to go physical.</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
            <Link className="btn btn-primary" href="/marketplace?category=graphic-design-creative">Browse Design Catalogue →</Link>
            <Link className="btn btn-outline" href="/marketplace/custom-brief">Submit a Custom Brief</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">What We Design</div>
            <h2>Six sub-services, one accountable design team</h2>
            <p>Each of these is quotable directly through the catalogue where a matching product exists, or through a Custom Brief for a bespoke scope.</p>
          </div>
          <div className="svc-grid">
            {page.subServices.map((s) => {
              const prod = s.productSlug ? productsBySlug[s.productSlug] : null;
              return (
                <div className="svc-card" key={s.title}>
                  <div className="ico">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  {prod ? (
                    <Link href={`/marketplace/product/${prod.slug}`} style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--rust)' }}>
                      From KES {Number(prod.base_price).toLocaleString()} →
                    </Link>
                  ) : (
                    <Link href="/marketplace/custom-brief" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--slate-lt)' }}>
                      Quote via Custom Brief →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)', borderTop: '0.5px solid var(--border-md)', borderBottom: '0.5px solid var(--border-md)' }}>
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">How A Design Engagement Runs</div>
            <h2>A six-step design process — distinct from our production methodology</h2>
            <p>Physical production (print, apparel, signage) follows TrioCraft&rsquo;s site-wide six-step methodology on the <Link href="/services" style={{ color: 'var(--rust)', fontWeight: 600 }}>Capability Statement</Link>. A design engagement runs its own process first, ending in a handover into that same production pipeline.</p>
          </div>
          <div className="steps method-steps">
            {page.process.map((s, i) => (
              <div className="step" key={s.title}><div className="num">{i + 1}</div><h4>{s.title}</h4><p>{s.body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 40, alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 14 }}>What You Actually Receive</h2>
            <ul className="check-list">
              {page.deliverables.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
          {caseStudy && (
            <div className="work-card">
              <div className="thumb">{caseStudy.image ? <img src={caseStudy.image} alt={caseStudy.title} /> : caseStudy.icon}</div>
              <div className="body">
                <div className="loc">Case Study · {caseStudy.location}</div>
                <h4>{caseStudy.title}</h4>
                <p>{caseStudy.description}</p>
                <Link href="/work" style={{ display: 'inline-block', marginTop: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--rust)' }}>See more of our work →</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)', borderTop: '0.5px solid var(--border-md)', borderBottom: '0.5px solid var(--border-md)' }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="section-hd">
            <div className="eyebrow">Frequently Asked</div>
            <h2>Design engagement FAQ</h2>
          </div>
          <div className="cap-grid">
            {page.faqs.map((f) => (
              <details className="cap-card" key={f.q}>
                <summary>
                  <span className="cap-title">{f.q}</span>
                  <span className="cap-toggle">＋</span>
                </summary>
                <div className="cap-body">
                  <p>{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="cta-band">
            <h3>Have a brief? Let&rsquo;s design it right the first time.</h3>
            <p>Tell us what you need — a logo, a full identity, or a single social content pack — and we&rsquo;ll scope it against this process.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
              <Link className="btn btn-primary" href="/marketplace/custom-brief">Submit a Custom Brief →</Link>
              <a className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.3)', color: '#fff' }} href={site?.whatsappLink} target="_blank" rel="noopener">Discuss on WhatsApp</a>
            </div>
            {site && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', lineHeight: 1.9 }}>
                📞 {site.phoneDisplay} &nbsp;·&nbsp; ✉ {site.email} &nbsp;·&nbsp; {site.address}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
