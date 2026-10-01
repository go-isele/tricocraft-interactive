import Link from 'next/link';
import { INTERNAL_API_URL } from '@/lib/api';

export const metadata = {
  title: 'TrioCraft Brands Ltd — Transforming Physical Spaces Into Immersive Brand Experiences',
  description:
    'TrioCraft transforms offices, events, apparel, and vehicles into immersive brand experiences — backed by a vetted production network and a live Production Marketplace.',
};

async function getHome() {
  const res = await fetch(`${INTERNAL_API_URL}/api/home`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load home page data');
  return res.json();
}

export default async function HomePage() {
  const { categories, posts, providerCount, featuredProjects, testimonials } = await getHome();

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">⬡ Nairobi, Kenya · {providerCount}+ Vetted Production Partners</div>
          <h1>Transforming physical spaces into <em>immersive brand experiences.</em></h1>
          <p className="lede">From a reception wall to a full exhibition stand, TrioCraft manages the complete branding lifecycle — strategy, design, production, and quality assurance — through one accountable team and a curated production network.</p>
          <div className="cta-row">
            <Link className="btn btn-primary" href="/work">See Our Work</Link>
            <Link className="btn btn-outline" href="/marketplace/custom-brief">Start a Project →</Link>
          </div>
          <div className="stats">
            <div className="stat"><b>{providerCount}+</b><span>Vetted Production Partners</span></div>
            <div className="stat"><b>11</b><span>Service Categories</span></div>
            <div className="stat"><b>100%</b><span>Pantone-Matched Quality Checks</span></div>
          </div>
          <div className="sector-row">
            <span className="sector-pill">Government</span>
            <span className="sector-pill">NGOs</span>
            <span className="sector-pill">Corporates</span>
            <span className="sector-pill">Political Campaigns</span>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">Apparel &amp; Wearable Branding</div>
            <h2>Branded merchandise, produced at scale</h2>
            <p>Polos, hoodies, and full apparel drops — embroidered or screen-printed to spec, with quality checks before anything ships.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, alignItems: 'stretch' }}>
            <img src="/img/site/apparel-new-collection.jpg" alt="TrioCraft branded apparel collection" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-md)' }} />
            <img src="/img/site/apparel-lineup.jpg" alt="TrioCraft branded t-shirts" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-md)' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link className="btn btn-outline" href="/marketplace?category=apparel-wearable-branding">Shop Apparel &amp; Wearable Branding →</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">Recent Work</div>
            <h2>Real spaces, real installations</h2>
            <p>A sample of what &ldquo;immersive brand experience&rdquo; looks like once it&rsquo;s built.</p>
          </div>
          <div className="project-strip">
            {featuredProjects.map((p) => (
              <Link className="project-card" href="/work" key={p.slug || p.title}>
                <div className="thumb">{p.image ? <img src={p.image} alt={p.title} /> : p.icon}</div>
                <div className="body">
                  <div className="loc">{p.location}</div>
                  <h4>{p.title}</h4>
                  <p>{p.description}</p>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link className="btn btn-outline" href="/work">View All Work →</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)', borderTop: '0.5px solid var(--border-md)', borderBottom: '0.5px solid var(--border-md)' }}>
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">What We Transform</div>
            <h2>One platform. Every branding need.</h2>
          </div>
          <div className="svc-grid">
            {categories.slice(0, 6).map((c) => (
              <Link className="svc-card" href={`/marketplace?category=${c.slug}`} key={c.slug}>
                <div className="ico">{c.icon}</div>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link className="btn btn-outline" href="/services">View All Services →</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">How It Works</div>
            <h2>From brand idea to finished installation</h2>
          </div>
          <div className="steps">
            <div className="step"><div className="num">1</div><h4>Build Your Brand Vault</h4><p>Upload your logo, colours, and guidelines once — every order pulls from the same approved assets.</p></div>
            <div className="step"><div className="num">2</div><h4>Pick from the Catalogue</h4><p>Apparel, packaging, signage, promotional merchandise, and more — all vetted and Pantone-matched.</p></div>
            <div className="step"><div className="num">3</div><h4>Approve Your Mockup</h4><p>See a live rendered mockup before anything goes into production.</p></div>
            <div className="step"><div className="num">4</div><h4>Track to Delivery</h4><p>Real-time order tracking from quotation through quality check and delivery.</p></div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--white)', borderTop: '0.5px solid var(--border-md)', borderBottom: '0.5px solid var(--border-md)' }}>
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">Trusted By</div>
            <h2>What clients say after delivery</h2>
          </div>
          <div className="trust-bar">
            {testimonials.map((t) => (
              <div className="testimonial" key={t.name}>
                <p className="quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="who"><b>{t.name}</b> · {t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-hd">
            <div className="eyebrow">Resources</div>
            <h2>Guides for getting started</h2>
          </div>
          <div className="blog-grid">
            {posts.map((p) => (
              <Link className="blog-card" href={`/resources/${p.slug}`} key={p.slug}>
                <div className="thumb">▢</div>
                <div className="body">
                  <span className="tag">{p.eyebrow}</span>
                  <h4>{p.title}</h4>
                  <p>{p.excerpt}</p>
                  <div className="meta">
                    {new Date(p.published_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })} · {p.read_minutes} min read
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h3>Crafting Dreams, Forged in Brotherhood.</h3>
            <p>Ready to brand something properly? Browse the catalogue or send us a brief — no account required to get a quote.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/marketplace">Browse the Marketplace</Link>
              <Link className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.3)', color: '#fff' }} href="/marketplace/custom-brief">Submit a Custom Brief</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
