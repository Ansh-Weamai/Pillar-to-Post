"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const FEATURES = [
  {
    href: "/coverage",
    label: "Coverage Check",
    desc: "Confirm every checklist item has photo evidence.",
  },
  {
    href: "/evidence-check",
    label: "Evidence Consistency",
    desc: "Cross-check photo evidence against report claims.",
  },
  {
    href: "/contradiction-check",
    label: "Contradiction Flag",
    desc: "Flag findings that contradict what the photo shows.",
  },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const active = FEATURES.find((f) => f.href === pathname);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b-4 border-brand-green bg-brand-blue shadow-sm">
        <div className="mx-auto grid max-w-[960px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
          <Link href="/coverage" className="flex items-center justify-self-start">
            <span className="flex items-center rounded-[8px] bg-white px-3 py-2">
              <Image
                src="/pillar-to-post-logo.png"
                alt="Pillar To Post Home Inspectors"
                width={168}
                height={47}
                className="h-10 w-auto sm:h-12"
                priority
              />
            </span>
          </Link>

          <h1 className="hidden justify-self-center text-center text-[15px] font-bold tracking-wide text-white sm:block sm:text-[18px]">
            PTP360 · Second-Pass QA
          </h1>

          <button
            onClick={() => setOpen(true)}
            aria-label="Open features menu"
            aria-expanded={open}
            className="flex items-center gap-2 justify-self-end rounded-[6px] border border-white/30 px-3 py-2 text-white transition-colors hover:bg-white/10"
          >
            <Menu size={18} />
            <span className="text-[13px] font-bold">{active?.label ?? "Menu"}</span>
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Features"
        className={`fixed right-0 top-0 z-50 flex h-full w-[300px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-4 border-brand-green bg-brand-blue px-4 py-3">
          <span className="text-[13px] font-bold uppercase tracking-wide text-white">Features</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close features menu"
            className="rounded-[6px] p-1 text-white/90 transition-colors hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto">
          {FEATURES.map((f) => {
            const isActive = f.href === pathname;
            return (
              <Link
                key={f.href}
                href={f.href}
                onClick={() => setOpen(false)}
                className={`border-b border-line px-4 py-3.5 transition-colors ${
                  isActive ? "border-l-4 border-l-ptp-green bg-ptp-green-tint" : "border-l-4 border-l-transparent hover:bg-paper-warm"
                }`}
              >
                <div className={`text-[14px] font-bold ${isActive ? "text-ptp-green-strong" : "text-ink"}`}>
                  {f.label}
                </div>
                <div className="mt-0.5 text-[12px] leading-snug text-ink-soft">{f.desc}</div>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
