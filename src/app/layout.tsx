import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Cuci Steam",
  description: "Sistem kasir outlet cuci steam motor & mobil",
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
