import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wizer ERP Lite",
  description: "Gestión comercial para Wizer Bikes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
