import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container" style={{ padding: '100px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 34, marginBottom: 12 }}>Page not found</h1>
      <p style={{ color: 'var(--slate-lt)', marginBottom: 28 }}>That page doesn&rsquo;t exist.</p>
      <Link className="btn btn-dark" href="/">Back to Home</Link>
    </main>
  );
}
