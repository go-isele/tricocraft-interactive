import Link from 'next/link';
import { notFound } from 'next/navigation';
import { INTERNAL_API_URL } from '@/lib/api';
import MarketplaceShell from '@/components/dash/MarketplaceShell';
import ProductConfigurator from '@/components/ProductConfigurator';

async function getProduct(slug) {
  const res = await fetch(`${INTERNAL_API_URL}/api/marketplace/products/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load product');
  return res.json();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) return { title: 'Not found — TrioCraft Marketplace' };
  return { title: `${data.product.name} — TrioCraft Marketplace` };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) notFound();
  const { product, providers, pricing } = data;

  return (
    <MarketplaceShell active="catalogue">
      <div className="crumbs" style={{ margin: '24px 0 0' }}>
        <Link href="/marketplace">Product Catalogue</Link> &nbsp;/&nbsp; {product.category_name}
      </div>
      <ProductConfigurator product={product} providers={providers} pricing={pricing} />
    </MarketplaceShell>
  );
}
