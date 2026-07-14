import type { Metadata, Viewport } from "next";
import "./globals.css";
// Each template's theme, scoped to [data-template="<slug>"]. Importing both is
// safe precisely BECAUSE they are scoped: neither can touch the other's subtree.
// The global sheet above carries no colours and no typefaces of its own.
import "@/templates/saffron/theme.css";
import "@/templates/villa/theme.css";

// The ROOT layout: <html>, <body>, nothing else. It knows nothing about which
// template is being rendered — that is decided per request, in the route, and the
// template's fonts + theme are applied there on a data-template wrapper.

export const metadata: Metadata = {
  metadataBase: new URL("https://unfoldinvite.com"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased overflow-hidden">
      <body className="min-h-full flex justify-center bg-white overflow-hidden fixed inset-0 touch-none">
        {children}
      </body>
    </html>
  );
}
