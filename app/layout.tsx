import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "PTP360 · Second-Pass QA",
  description: "Coverage, evidence-consistency, and contradiction checks for inspection photos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="mx-auto max-w-[960px] px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
