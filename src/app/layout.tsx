import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const interSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VIBZ TV - Painel",
  description: "Gerenciador de TV Corporativa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className="dark">
      <body
        className={`${interSans.variable} antialiased bg-[#050505] text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
