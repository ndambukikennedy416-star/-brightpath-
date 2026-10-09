import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import NavShell from "@/components/NavShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Brightpath Scholarship Management",
  description: "Post-acceptance beneficiary finance, academics, and impact tracking.",
  icons: { icon: "/logo.jpg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-zinc-50" suppressHydrationWarning>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Suspense>
            <NavShell>
              <Nav />
            </NavShell>
          </Suspense>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
