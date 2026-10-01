import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — TrioCraft',
  description: 'The terms that govern your use of triocraft.org and the TrioCraft Production Marketplace.',
};

const LAST_UPDATED = '1 October 2026';

export default function TermsPage() {
  return (
    <main className="article-wrap">
      <div className="crumbs">
        <Link href="/">Home</Link> &nbsp;/&nbsp; Terms of Service
      </div>
      <h1 className="article-title">Terms of Service</h1>
      <div className="article-meta">Last updated: {LAST_UPDATED}</div>

      <div className="article-body">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of triocraft.org and
          the TrioCraft Production Marketplace (together, the &ldquo;Service&rdquo;), operated by TrioCraft
          Brands Ltd (&ldquo;TrioCraft,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By creating an account,
          placing an order, or otherwise using the Service, you agree to these Terms. If you&rsquo;re using
          the Service on behalf of a company, you confirm you have the authority to bind that company to
          these Terms.
        </p>

        <h2>1. Our Service</h2>
        <p>
          TrioCraft provides branding, printing, design, and production services, including a product
          catalogue, custom brief submissions, order tracking, and a Brand Vault for storing your brand
          assets. Orders are fulfilled by TrioCraft directly or by vetted production partners in our
          network, under our quality standards.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You can register with an email and password, or sign in with Google (processed via our
          authentication provider, Clerk — see our{' '}
          <Link href="/privacy">Privacy Policy</Link>). You&rsquo;re responsible for keeping your login
          credentials confidential and for all activity on your account. Keep your account details
          accurate and up to date. We may suspend or close an account that provides false information, is
          used fraudulently, or breaches these Terms.
        </p>
        <p>
          Corporate accounts with credit terms (30/60/90 days, against an approved Local Purchase Order)
          are extended at our discretion, after we verify the business. We can adjust or withdraw credit
          terms at any time, including for an account that falls behind on payment.
        </p>

        <h2>3. Orders, Quotations &amp; Pricing</h2>
        <p>
          Prices shown in currencies other than Kenyan Shillings (UGX, TZS, RWF) are converted for display
          using our published exchange rates and are estimates — the amount actually charged is settled in
          the currency and method your payment provider supports. A quotation isn&rsquo;t a confirmed order
          until you accept it and, where applicable, make payment or provide an approved LPO.
        </p>
        <p>
          For custom work, we&rsquo;ll share a design proof or mockup before production begins. Production
          does not start until you approve the proof. Once you approve a proof, you&rsquo;re responsible for
          any errors it contains — spelling, colours, layout, quantities — so please review it carefully.
        </p>

        <h2>4. Payment</h2>
        <p>
          <strong>Retail orders:</strong> payment is due at checkout via M-Pesa, MTN Mobile Money, Airtel
          Money, or another method we offer, before we begin production.
        </p>
        <p>
          <strong>Corporate accounts:</strong> payment is due per your agreed credit terms, against our tax
          invoice (issued via KRA e-TIMS) and your Local Purchase Order.
        </p>
        <p>All prices are exclusive of VAT and any other applicable taxes unless stated otherwise.</p>

        <h2>5. Cancellations &amp; Refunds</h2>
        <p>
          You can cancel an order and receive a full refund any time before production has started, minus
          any cost we&rsquo;ve already incurred on your behalf (for example, a paid design proof or
          materials ordered specifically for your job).
        </p>
        <p>
          Once production has started on a custom or made-to-order item, it can&rsquo;t be cancelled or
          refunded, because it&rsquo;s produced specifically for you and can&rsquo;t be resold.
        </p>
        <p>
          If an item arrives damaged, defective, or doesn&rsquo;t match the proof you approved, tell us
          within 7 days of delivery and we&rsquo;ll reprint or correct it at no extra cost. This does not
          cover errors in artwork or specifications you approved before production.
        </p>

        <h2>6. Delivery</h2>
        <p>
          Delivery timelines we give you are estimates, not guarantees — production and courier delays
          (including customs, for cross-border EAC deliveries) can happen outside our control. Risk in
          physical goods passes to you on delivery to the address you provided.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          You keep ownership of any logo, artwork, or content you upload or send us. You grant us a licence
          to use it solely to produce and deliver your order, and — unless you tell us otherwise in writing
          — to display the finished work in our portfolio and marketing. You confirm you have the right to
          use and share any content you give us, and you&rsquo;ll cover us for any claim that it infringes
          someone else&rsquo;s rights.
        </p>
        <p>
          TrioCraft and our production partners keep ownership of our own templates, mockup tools, and
          proprietary processes — ordering a product doesn&rsquo;t transfer these to you.
        </p>

        <h2>8. Acceptable Use</h2>
        <p>
          Don&rsquo;t use the Service to submit content that is illegal, infringes someone else&rsquo;s
          rights, or that we reasonably believe is fraudulent, abusive, or harmful. We can refuse or cancel
          an order, or suspend an account, for this reason.
        </p>

        <h2>9. Disclaimers &amp; Limitation of Liability</h2>
        <p>
          The Service is provided &ldquo;as is.&rdquo; While we take care in producing your order, minor
          variations in colour, material, or finish between a digital proof and the physical product are
          normal and not a defect. To the fullest extent permitted by Kenyan law, our total liability for
          any claim relating to an order is limited to the amount you paid for that order, and we&rsquo;re
          not liable for indirect or consequential losses, such as lost profits or lost business
          opportunities. Nothing in these Terms limits liability that can&rsquo;t be limited by law.
        </p>

        <h2>10. Vendors &amp; Production Partners</h2>
        <p>
          Some orders are fulfilled by vetted production partners rather than TrioCraft directly. These
          Terms govern your relationship with TrioCraft as the party you&rsquo;ve contracted with; our
          production partners operate under a separate agreement with us and our quality standards.
        </p>

        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We&rsquo;ll update the date above, and for material
          changes, we&rsquo;ll notify registered users by email. Continuing to use the Service after a
          change takes effect means you accept the updated Terms.
        </p>

        <h2>12. Governing Law &amp; Disputes</h2>
        <p>
          These Terms are governed by the laws of Kenya. Any dispute that can&rsquo;t be resolved amicably
          will be subject to the exclusive jurisdiction of the courts of Kenya.
        </p>

        <h2>13. Contact Us</h2>
        <p>
          Questions about these Terms:{' '}
          <a href="mailto:triocraft.brands@gmail.com">triocraft.brands@gmail.com</a> · WhatsApp{' '}
          <a href="https://wa.me/254111206420" target="_blank" rel="noreferrer">+254 111 206 420</a> ·
          TrioCraft Brands Ltd, Nairobi, Kenya.
        </p>
      </div>
    </main>
  );
}
