import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AppSerwistProvider } from "@/components/serwist-provider";
import { MetaPixel } from "@/components/meta-pixel";
import { RetailHeader } from "@/components/retail-header";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, BRAND } from "@/lib/site";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002"
  ),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_SHORT_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_SHORT_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [{ url: "/logo.png", width: 359, height: 240, alt: APP_NAME }],
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: BRAND.navy,
  colorScheme: "light" as const,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className={montserrat.variable}>
      <body className="min-h-screen antialiased font-sans">
        <AppSerwistProvider>
          <MetaPixel />
          <div className="flex min-h-screen flex-col bg-[var(--color-app-bg)]">
            <RetailHeader />
            {children}
          </div>
        </AppSerwistProvider>
      </body>
    </html>
  );
}
