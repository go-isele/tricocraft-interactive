import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { INTERNAL_API_URL } from "@/lib/api";

// favicon.ico, icon.png, apple-icon.png, opengraph-image.png, twitter-image.png,
// and manifest.json all live in this folder as Next.js file conventions —
// Next wires them into <head> automatically (favicon/icon/apple-icon links,
// og:image/twitter:image tags, manifest link). metadataBase is required for
// those relative image paths to resolve to absolute URLs in the actual
// og:image/twitter:image meta tags that get shared.
const SITE_NAME = "TrioCraft Brands Ltd";
const SITE_DESCRIPTION =
  "TrioCraft Brands Ltd — transforming physical spaces into immersive brand experiences. Nairobi-based branding, printing, design, and marketing solutions.";

export const metadata = {
  metadataBase: new URL("https://triocraft.org"),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: "TrioCraft",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "https://triocraft.org",
    locale: "en_KE",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#002B49",
};

async function getSiteConfig() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/site-config`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }) {
  const config = await getSiteConfig();
  const site = config?.site || null;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <SiteHeader site={site} />
          {children}
          <SiteFooter site={site} />
          <WhatsAppFloat site={site} />
        </AuthProvider>
      </body>
    </html>
  );
}
