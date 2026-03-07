import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SD Budget Voice — FY2027 San Diego Budget Survey",
  description:
    "Explore real San Diego budget data, make tradeoff decisions, and submit your FY2027 budget priorities. A context-rich alternative to the mayor's survey.",
  openGraph: {
    title: "SD Budget Voice",
    description: "Your City. Your Budget. Your Call.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} antialiased bg-gray-950`}>
        {children}
      </body>
    </html>
  );
}
