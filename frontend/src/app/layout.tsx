import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "./providers";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import { getSiteContent } from "@/lib/cms-server";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { site: siteConfig } = await getSiteContent();
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} | Income Tax, GST, Accounting & Compliance Experts`,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: [
      "income tax filing",
      "ITR filing",
      "GST registration",
      "GST return filing",
      "accounting services",
      "TDS return",
      "ROC compliance",
      "company registration",
      "startup services",
      "tax planning",
      "India",
    ],
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: siteConfig.name,
      title: `${siteConfig.name} | ${siteConfig.tagline}`,
      description: siteConfig.description,
      url: siteConfig.url,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteConfig.name} | ${siteConfig.tagline}`,
      description: siteConfig.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = await getSiteContent();
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteContentProvider content={content}>
          <AppProviders>{children}</AppProviders>
        </SiteContentProvider>
      </body>
    </html>
  );
}
