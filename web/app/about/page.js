import Link from 'next/link';
import { INTERNAL_API_URL } from '@/lib/api';

export const metadata = { title: 'About — TrioCraft Brands' };

async function getSiteConfig() {
  const res = await fetch(`${INTERNAL_API_URL}/api/site-config`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function AboutPage() {
  const config = await getSiteConfig();
  const site = config?.site;

  return (
    <>
      <section className="hero" style={{ padding: '56px 0 40px' }}>
        <div className="container">
          <div className="eyebrow">⬡ About TrioCraft</div>
          <h1 style={{ fontSize: 40 }}>Transforming physical spaces into immersive brand experiences.</h1>
          <p className="lede">TrioCraft Brands Ltd is a Nairobi-based branding, printing, design, and marketing solutions company — built to manage the complete branding lifecycle from strategy to installation.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <img src="/img/site/nairobi-skyline.jpg" alt="Nairobi skyline" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-md)' }} />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <h2 style={{ fontSize: 26, marginBottom: 14 }}>Our Approach</h2>
          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.75, marginBottom: 20 }}>
            We don&rsquo;t position ourselves as a print shop. We operate as a creative-led branding agency using a curated production network — what our team calls the &ldquo;Airbnb of branding&rdquo;: we own the process, the creativity, the quality control, and the client experience, while a vetted network of specialist partners handles physical production. That means one accountable team for a business card, an office fit-out, or a full vehicle fleet wrap — never five vendors and five invoices.
          </p>

          <h2 style={{ fontSize: 26, margin: '36px 0 14px' }}>Our Values</h2>
          <div className="svc-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="svc-card"><h3 style={{ fontSize: 16 }}>Craftsmanship</h3><p>Every detail — paper stock, Pantone match, finish — treated as part of the brand, not an afterthought.</p></div>
            <div className="svc-card"><h3 style={{ fontSize: 16 }}>Brotherhood</h3><p>Long-term partnerships with clients and production partners alike, built on trust.</p></div>
            <div className="svc-card"><h3 style={{ fontSize: 16 }}>Innovation</h3><p>New formats, new materials, new ways to make a space or product say something.</p></div>
            <div className="svc-card"><h3 style={{ fontSize: 16 }}>Quality</h3><p>Vetted, Pantone-matched production partners and a quality check before anything ships.</p></div>
            <div className="svc-card"><h3 style={{ fontSize: 16 }}>Customer-Centricity</h3><p>Real-time order tracking and a single point of contact from brief to delivery.</p></div>
            <div className="svc-card"><h3 style={{ fontSize: 16 }}>Integrity</h3><p>Transparent quotes, honest timelines, no surprises at delivery.</p></div>
          </div>

          <h2 style={{ fontSize: 26, margin: '36px 0 14px' }}>Who We Work With</h2>
          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.75, marginBottom: 16 }}>
            TrioCraft delivers institutional-grade branding across government institutions, NGOs &amp; development partners, SMEs &amp; corporates, and political campaigns — see the full <Link href="/services" style={{ color: 'var(--rust)', fontWeight: 600 }}>Capability Statement</Link> for all 11 service categories.
          </p>

          <div className="cta-band" style={{ marginTop: 32 }}>
            <h3>&ldquo;{site?.tagline}&rdquo;</h3>
            <p>That&rsquo;s not a tagline we picked for the website — it&rsquo;s how the team actually works.</p>
            <Link className="btn btn-primary" href="/contact">Get in Touch →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
