import type { Metadata } from "next";
import "./globals.css";
import TabBar from "./components/TabBar";

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
        <div className="mx-auto max-w-[960px] px-4 pt-6">
          <span className="text-[14px] text-ink-soft">PTP360 · Second-Pass QA</span>
        </div>
        <TabBar />
        <main className="mx-auto max-w-[960px] px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
