import Link from 'next/link';
import { INTERNAL_API_URL } from '@/lib/api';
import WorkGrid from '@/components/WorkGrid';

export const metadata = {
  title: 'Our Work — TrioCraft Brands',
  description: 'See how TrioCraft transforms offices, exhibitions, vehicles, and events into powerful brand experiences across Kenya.',
};

async function getWork() {
  const res = await fetch(`${INTERNAL_API_URL}/api/work`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load work page data');
  return res.json();
}

export default async function WorkPage() {
  const { projects, projectCategories } = await getWork();

  return (
    <>
      <section className="hero" style={{ padding: '56px 0 36px' }}>
        <div className="container">
          <div className="eyebrow">⬡ Our Work</div>
          <h1 style={{ fontSize: 40 }}>Installations, not just print jobs.</h1>
          <p className="lede">A sample of offices, events, apparel runs, and vehicle fleets TrioCraft has branded end to end.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <WorkGrid projects={projects} projectCategories={projectCategories} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h3>See your brand here next.</h3>
            <p>Tell us what you&rsquo;re transforming — office, event, fleet, or a full campaign.</p>
            <Link className="btn btn-primary" href="/marketplace/custom-brief">Submit a Custom Brief →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
