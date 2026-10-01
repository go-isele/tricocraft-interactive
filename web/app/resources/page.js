import Link from 'next/link';
import { INTERNAL_API_URL } from '@/lib/api';

export const metadata = { title: 'Resources — TrioCraft' };

async function getResources() {
  const res = await fetch(`${INTERNAL_API_URL}/api/resources`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load resources');
  return res.json();
}

export default async function ResourcesPage() {
  const { posts } = await getResources();

  return (
    <>
      <section className="hero" style={{ padding: '56px 0 40px' }}>
        <div className="container">
          <div className="eyebrow">⬡ Resources</div>
          <h1 style={{ fontSize: 40 }}>Guides, tips, and playbooks</h1>
          <p className="lede">Practical guidance on branding, production, and getting the most out of the Production Marketplace.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {!posts.length ? (
            <div className="empty-state"><div className="ico">✎</div><p>No articles published yet.</p></div>
          ) : (
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
          )}
        </div>
      </section>
    </>
  );
}
