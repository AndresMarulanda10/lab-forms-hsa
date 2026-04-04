import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import HelpBubble from "@/components/HelpBubble";

export const metadata: Metadata = {
  title: "Lab Forms — HSA",
  description:
    "Sistema de registros de laboratorio — E.S.E. Hospital San Antonio de Chía",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
        <HelpBubble />
      </body>
    </html>
  );
}
