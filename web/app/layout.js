import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { INTERNAL_API_URL } from "@/lib/api";

export const metadata = {
  title: "TrioCraft Brands Ltd",
  description:
    "TrioCraft Brands Ltd — transforming physical spaces into immersive brand experiences. Nairobi-based branding, printing, design, and marketing solutions.",
  icons: {
    icon: "/img/triocraft-icon.svg",
  },
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
