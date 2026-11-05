import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotiza — tu oficio, en claro",
  description: "El estudio de tu próximo trabajo. Prepara presupuestos con tu marca, comparte una propuesta y sigue cada respuesta.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head><link rel="preload" href="/fonts/bricolage-variable.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/><link rel="preload" href="/fonts/manrope-variable.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
