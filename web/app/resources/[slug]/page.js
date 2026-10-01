import Link from 'next/link';
import { notFound } from 'next/navigation';
import { INTERNAL_API_URL } from '@/lib/api';

async function getPost(slug) {
  const res = await fetch(`${INTERNAL_API_URL}/api/resources/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load article');
  return res.json();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getPost(slug);
  if (!data) return { title: 'Not found — TrioCraft' };
  return { title: data.post.title, description: data.post.meta_description };
}

export default async function ResourcePostPage({ params }) {
  const { slug } = await params;
  const data = await getPost(slug);
  if (!data) notFound();
  const { post, related } = data;

  return (
    <>
      <main className="article-wrap">
        <div className="crumbs">
          <Link href="/">Home</Link> &nbsp;/&nbsp; <Link href="/resources">Resources</Link> &nbsp;/&nbsp; {post.title}
        </div>
        <div className="hero" style={{ padding: 0, background: 'none' }}>
          <div className="eyebrow">{post.eyebrow}</div>
        </div>
        <h1 className="article-title">{post.title}</h1>
        <div className="article-meta">
          <span>TrioCraft Brands Ltd</span>
          <span>·</span>
          <span>{new Date(post.published_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>·</span>
          <span>{post.read_minutes} min read</span>
        </div>

        <div className="article-body" dangerouslySetInnerHTML={{ __html: post.body_html }} />

        <div className="cta-band" style={{ marginTop: 48 }}>
          <h3>Crafting Dreams, Forged in Brotherhood.</h3>
          <p>Ready to start? Activate your Production Marketplace access and set up your Brand Vault today.</p>
          <Link className="btn btn-primary" href="/register">Request Access →</Link>
        </div>
      </main>

      {related && related.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <h3 style={{ fontSize: 22, marginBottom: 18 }}>More from Resources</h3>
            <div className="blog-grid">
              {related.map((p) => (
                <Link className="blog-card" href={`/resources/${p.slug}`} key={p.slug}>
                  <div className="thumb">▢</div>
                  <div className="body">
                    <span className="tag">{p.eyebrow}</span>
                    <h4>{p.title}</h4>
                    <p>{p.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
