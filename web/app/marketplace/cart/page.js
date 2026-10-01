import MarketplaceShell from '@/components/dash/MarketplaceShell';
import CartBody from '@/components/CartBody';

export const metadata = { title: 'Cart — TrioCraft Marketplace' };

export default function CartPage() {
  return (
    <MarketplaceShell
      active="cart"
      title="Cart"
      subtitle="Review your items before submitting to the Production Marketplace."
      publicHeading="Cart"
      publicSub="Review your items — no account needed to request a quote."
    >
      <CartBody />
    </MarketplaceShell>
  );
}
