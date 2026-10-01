import MarketplaceShell from '@/components/dash/MarketplaceShell';
import CustomBriefForm from '@/components/CustomBriefForm';

export const metadata = { title: 'Custom Brief — TrioCraft Marketplace' };

export default function CustomBriefPage() {
  return (
    <MarketplaceShell
      active="custom"
      title="Custom Brief"
      subtitle="Anything that needs a genuinely original look — rebrands, campaigns, product launches. TrioCraft's designers build it from scratch."
      publicHeading="Tell us what you're transforming."
      publicSub="No account needed — describe the project and TrioCraft's design team will follow up with a quote. We'll set you up with order tracking automatically."
    >
      <CustomBriefForm />
    </MarketplaceShell>
  );
}
