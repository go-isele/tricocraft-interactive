'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MarketplaceShell, { GuestUpsell } from '@/components/dash/MarketplaceShell';
import CatalogueGrid from '@/components/CatalogueGrid';

function CatalogueInner() {
  const searchParams = useSearchParams();
  const activeCat = searchParams.get('category');

  return (
    <MarketplaceShell
      active="catalogue"
      title="Product Catalogue"
      subtitle="Browse TrioCraft&rsquo;s vetted categories. Pick a product to see providers, pricing, and place an order."
      publicHeading="Product Catalogue"
      publicSub={<GuestUpsell />}
    >
      <CatalogueGrid activeCat={activeCat} />
    </MarketplaceShell>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense>
      <CatalogueInner />
    </Suspense>
  );
}
