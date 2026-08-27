import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.howhot.today"),

  title: "HowHot.today | Weather Consensus",
  description:
    "Compare multiple weather models for a clearer, more confident forecast.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: "/",
    siteName: "HowHot.today",
    title: "HowHot.today | Weather Consensus",
    description:
      "Compare multiple weather models for a clearer, more confident forecast.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HowHot.today weather consensus forecast",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "HowHot.today | Weather Consensus",
    description:
      "Compare multiple weather models for a clearer, more confident forecast.",
    images: ["/og-image.png"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HowHot.today",
  alternateName: "How Hot Today",
  url: "https://www.howhot.today/",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />

        {children}

        <Analytics />
      </body>
    </html>
  );
}