import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
