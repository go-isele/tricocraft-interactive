export default function LegalPage({ heading }) {
  return (
    <main className="article-wrap">
      <h1 className="article-title" style={{ fontSize: 34 }}>{heading}</h1>
      <div className="form-error" style={{ marginBottom: 24 }}>
        This page is a placeholder. Replace this content with your reviewed {heading.toLowerCase()} before relying on it publicly.
      </div>
      <div className="article-body">
        <p>TrioCraft Brands Ltd (&ldquo;TrioCraft&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy and is committed to protecting any information you share with us through this website and the Production Marketplace.</p>
        <p>Add your finalised {heading.toLowerCase()} text here — what data is collected (contact form, brand vault uploads, order details), how it&rsquo;s used, how long it&rsquo;s retained, and how a client can request deletion or export.</p>
      </div>
    </main>
  );
}
