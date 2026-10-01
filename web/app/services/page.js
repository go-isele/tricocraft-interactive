import Link from 'next/link';
import { INTERNAL_API_URL } from '@/lib/api';

export const metadata = {
  title: 'Capability Statement — TrioCraft Brands Ltd',
  description: 'TrioCraft Brands Ltd capability statement — 11 core service categories for enterprise, government, NGO, and political clients, with LPO-ready production specs.',
};

async function getServices() {
  const res = await fetch(`${INTERNAL_API_URL}/api/services`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load services data');
  return res.json();
}
async function getSiteConfig() {
  const res = await fetch(`${INTERNAL_API_URL}/api/site-config`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function ServicesPage() {
  const [{ categories, DIFFERENTIATORS, METHODOLOGY_STEPS, QUALITY_POINTS, VALUE_PROPS }, config] = await Promise.all([
    getServices(),
    getSiteConfig(),
  ]);
  const site = config?.site;

  return (
    <>
      <section className="hero" style={{ padding: '56px 0 40px' }}>
        <div className="container">
          <div className="eyebrow">⬡ Capability Statement</div>
          <h1 style={{ fontSize: 38 }}>Eleven core service capabilities. One accountable team.</h1>
          <p className="lede">TrioCraft Brands Ltd is a full-service branding, design, and print solutions firm delivering end-to-end brand execution for corporate, government, NGO, and political clients. Never compete on price — compete on creativity, quality, speed, professionalism, reliability.</p>
          <div className="sector-row">
            <span className="sector-pill">Government Institutions</span>
            <span className="sector-pill">NGOs &amp; Development Partners</span>
            <span className="sector-pill">SMEs &amp; Corporates</span>
            <span className="sector-pill">Political Campaigns</span>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <h2 style={{ fontSize: 24, marginBottom: 14 }}>Company Overview</h2>
          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.75 }}>
            We operate as a creative-led, process-driven agency, combining strategy, design, production, and project management to deliver high-impact branding solutions with speed, precision, and consistency. Our model leverages a curated production network, allowing us to deliver scalable, high-quality outputs without the limitations of traditional print shops.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">Core Service Capabilities</div>
            <h2>11 core service categories</h2>
            <p>Each category below is quotable through the Product Catalogue or a Custom Brief — expand a card for material standards, finishing options, and how it&rsquo;s invoiced against an LPO.</p>
          </div>
          <div className="cap-grid">
            {categories.map((c) => (
              <details className="cap-card" key={c.slug}>
                <summary>
                  <span className="cap-code">{c.service_code}</span>
                  <span className="cap-ico">{c.icon}</span>
                  <span className="cap-title">{c.name}</span>
                  <span className="cap-toggle">＋</span>
                </summary>
                <div className="cap-body">
                  <p>{c.description}</p>
                  {c.specs && (
                    <>
                      <div className="spec-row"><span className="spec-lbl">Material Standards</span><span>{c.specs.materialStandards}</span></div>
                      <div className="spec-row"><span className="spec-lbl">Finishing Options</span><span>{c.specs.finishingOptions}</span></div>
                      <div className="spec-row"><span className="spec-lbl">LPO / Invoicing</span><span>{c.specs.lpoCompliance}</span></div>
                    </>
                  )}
                  {c.slug === 'graphic-design-creative' ? (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                      <Link className="btn btn-outline btn-sm" href="/services/graphic-design-creative">View Full Category Page →</Link>
                      <Link className="btn btn-outline btn-sm" href={`/marketplace?category=${c.slug}`}>Browse {c.name} →</Link>
                    </div>
                  ) : (
                    <Link className="btn btn-outline btn-sm" style={{ marginTop: 14 }} href={`/marketplace?category=${c.slug}`}>Browse {c.name} →</Link>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)', borderTop: '0.5px solid var(--border-md)', borderBottom: '0.5px solid var(--border-md)' }}>
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">Key Differentiators</div>
            <h2>Why institutional clients work with TrioCraft</h2>
          </div>
          <div className="svc-grid diff-grid">
            {DIFFERENTIATORS.map((d, i) => (
              <div className="svc-card" key={d.title}>
                <div className="ico">{i + 1}</div>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">Project Approach</div>
            <h2>A repeatable six-step methodology</h2>
          </div>
          <div className="steps method-steps">
            {METHODOLOGY_STEPS.map((s, i) => (
              <div className="step" key={s.title}><div className="num">{i + 1}</div><h4>{s.title}</h4><p>{s.body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)', borderTop: '0.5px solid var(--border-md)', borderBottom: '0.5px solid var(--border-md)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 14 }}>Quality &amp; Compliance</h2>
            <ul className="check-list">
              {QUALITY_POINTS.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </div>
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 14 }}>Client Value Proposition</h2>
            <ul className="check-list">
              {VALUE_PROPS.map((v) => <li key={v}>{v}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="cta-band">
            <h3>&ldquo;{site?.tagline}&rdquo;</h3>
            <p>TrioCraft positions itself not just as a service provider, but as a strategic branding partner capable of executing projects at scale with precision and excellence.</p>
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
