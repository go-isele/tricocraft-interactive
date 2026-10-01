import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — TrioCraft',
  description: 'How TrioCraft Brands Ltd collects, uses, and protects your personal information across triocraft.org and the Production Marketplace.',
};

const LAST_UPDATED = '1 October 2026';

export default function PrivacyPage() {
  return (
    <main className="article-wrap">
      <div className="crumbs">
        <Link href="/">Home</Link> &nbsp;/&nbsp; Privacy Policy
      </div>
      <h1 className="article-title">Privacy Policy</h1>
      <div className="article-meta">Last updated: {LAST_UPDATED}</div>

      <div className="article-body">
        <p>
          TrioCraft Brands Ltd (&ldquo;TrioCraft,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) provides
          branding, printing, design, and production services through triocraft.org and the Production
          Marketplace (together, the &ldquo;Service&rdquo;). This policy explains what personal information we
          collect, why, how we use and share it, and the choices and rights you have.
        </p>
        <p>
          It applies to visitors to our website, people who submit a brief or contact us, and registered
          marketplace accounts — both retail and corporate/B2B.
        </p>

        <h2>Information We Collect</h2>
        <p>
          <strong>Account information.</strong> When you register — with an email and password, or by
          signing in with Google — we collect your name and email address. If you set up a corporate
          account, we also collect your company name, phone number, KRA PIN (for tax-compliant invoicing),
          and the credit-account details we verify before extending payment terms.
        </p>
        <p>
          <strong>Google sign-in.</strong> If you choose &ldquo;Continue with Google,&rdquo; our
          authentication provider, Clerk, handles the sign-in with Google and shares your name and email
          address with us so we can create or recognize your account. We never receive your Google
          password, and we only request the minimum information needed to identify you.
        </p>
        <p>
          <strong>Order and brief information.</strong> When you place an order, request a quote, or
          submit a custom brief, we collect the details you provide — product specifications, quantities,
          delivery instructions, deadlines, and any text or files describing what you want produced.
        </p>
        <p>
          <strong>Brand Vault uploads.</strong> Logos, brand guidelines, artwork, and other files you
          upload so we — and, where relevant, the production partner fulfilling your order — can use them
          to complete your work.
        </p>
        <p>
          <strong>Payment information.</strong> We do not collect or store your M-Pesa PIN, mobile money
          PIN, or full card details. Mobile money and bank transactions are processed directly by
          Safaricom (M-Pesa), MTN Mobile Money, or Airtel Money; we receive only a transaction reference,
          phone number, amount, and status, which we use to confirm and reconcile your payment.
        </p>
        <p>
          <strong>Communications.</strong> Messages you send us through our contact form, WhatsApp, or
          email, including anything you tell us in them.
        </p>
        <p>
          <strong>Technical information.</strong> Our website uses one cookie that isn&rsquo;t optional: a
          session cookie that keeps you signed in. We don&rsquo;t use third-party advertising or analytics
          trackers. We do load Google Fonts from Google&rsquo;s servers to display our typography, which
          means your browser makes a request to Google when you visit — Google&rsquo;s own privacy policy
          covers that request.
        </p>

        <h2>How We Use Your Information</h2>
        <p>
          To create and manage your account, process and fulfil orders, generate quotations and
          tax-compliant invoices, communicate with you about your order (including via WhatsApp and
          email), verify and administer corporate credit accounts, detect and prevent fraud or abuse, and
          improve the Service.
        </p>
        <p>
          If you use AI Assist on the Custom Brief form, the text you type is sent to Anthropic&rsquo;s
          Claude API to help structure it into a clearer brief. We don&rsquo;t send this to Anthropic for
          anything beyond that one-time request, and it&rsquo;s processed under Anthropic&rsquo;s own
          data-handling terms, acting as a processor on our instructions.
        </p>

        <h2>Who We Share Information With</h2>
        <p>We share personal information only where it&rsquo;s needed to run the Service:</p>
        <ul>
          <li><strong>Clerk and Google</strong> — to offer Google sign-in (see above).</li>
          <li><strong>Safaricom (M-Pesa Daraja), MTN Mobile Money, and Airtel Money</strong> — to process mobile money payments.</li>
          <li><strong>Meta&rsquo;s WhatsApp Cloud API</strong> — to send order status updates and invoices if you&rsquo;ve opted to receive them on WhatsApp.</li>
          <li><strong>Our email delivery provider</strong> — to send order confirmations, quotations, and account notifications.</li>
          <li><strong>Kenya Revenue Authority&rsquo;s e-TIMS system</strong> (via our registered VSCU middleware) — fiscal invoice data we&rsquo;re legally required to transmit for every tax invoice.</li>
          <li><strong>Production partners</strong> fulfilling your specific order — limited to what they need to produce it (artwork files, specifications, delivery address), never your payment details or full account history.</li>
          <li><strong>Anthropic</strong> — only the brief text you submit to AI Assist, as described above.</li>
        </ul>
        <p>We do not sell your personal information, and we do not share it with third parties for their own marketing purposes.</p>

        <h2>Google User Data — Limited Use Disclosure</h2>
        <p>
          Information we receive via Google Sign-In is used solely to create and maintain your TrioCraft
          account and to let you sign in. We do not use it to serve ads, and we do not transfer it to any
          party except as described in this policy, or as required to provide and improve the Service,
          comply with the law, or with your consent. TrioCraft&rsquo;s use and transfer of information
          received from Google APIs adheres to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>, including the Limited Use requirements.
        </p>

        <h2>Data Retention</h2>
        <p>
          We keep account and order records for as long as your account is active, and for the period
          required by Kenyan tax and company law afterward (generally seven years for financial/tax
          records). Brand Vault files are kept for as long as your account exists, or until you ask us to
          delete them, whichever is sooner. You can ask us to close your account and delete your personal
          information at any time — see &ldquo;Your Rights&rdquo; below.
        </p>

        <h2>International Transfers</h2>
        <p>
          Some of the providers above — Clerk, Google, Anthropic, Meta — may process your data on servers
          outside Kenya. Where this happens, we rely on those providers&rsquo; own contractual and security
          safeguards to protect your information consistently with Kenya&rsquo;s Data Protection Act, 2019.
        </p>

        <h2>Your Rights</h2>
        <p>
          Under Kenya&rsquo;s Data Protection Act, 2019, you have the right to know what personal data we
          hold about you and why; access a copy of it; have inaccurate data corrected; request deletion or
          restriction of your data; object to certain processing; receive your data in a portable format;
          and withdraw consent at any time where we rely on it. To exercise any of these, email us at{' '}
          <a href="mailto:triocraft.brands@gmail.com">triocraft.brands@gmail.com</a> or message us on
          WhatsApp at{' '}
          <a href="https://wa.me/254111206420" target="_blank" rel="noreferrer">+254 111 206 420</a>.
          If you&rsquo;re unhappy with how we&rsquo;ve handled your data, you also have the right to lodge a
          complaint with Kenya&rsquo;s Office of the Data Protection Commissioner (
          <a href="https://www.odpc.go.ke" target="_blank" rel="noreferrer">odpc.go.ke</a>).
        </p>

        <h2>Children&rsquo;s Privacy</h2>
        <p>
          The Service is intended for businesses and individuals old enough to enter a binding contract.
          We don&rsquo;t knowingly collect personal information from children.
        </p>

        <h2>Security</h2>
        <p>
          We use industry-standard safeguards — encrypted connections (HTTPS), hashed passwords, and
          access controls — to protect your information. No system is completely secure, and we
          can&rsquo;t guarantee absolute security.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this policy as our services or legal obligations change. We&rsquo;ll update the
          &ldquo;last updated&rdquo; date above, and for material changes, we&rsquo;ll let registered users
          know by email.
        </p>

        <h2>Contact Us</h2>
        <p>
          Questions about this policy or your data:{' '}
          <a href="mailto:triocraft.brands@gmail.com">triocraft.brands@gmail.com</a> · WhatsApp{' '}
          <a href="https://wa.me/254111206420" target="_blank" rel="noreferrer">+254 111 206 420</a> ·
          TrioCraft Brands Ltd, Nairobi, Kenya.
        </p>
      </div>
    </main>
  );
}
