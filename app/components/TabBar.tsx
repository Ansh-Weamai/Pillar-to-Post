"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/coverage", label: "Coverage Check" },
  { href: "/evidence-check", label: "Evidence Consistency" },
  { href: "/contradiction-check", label: "Contradiction Flag" },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <div className="w-full border-b border-line">
      <div className="mx-auto flex max-w-[960px]">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 border-b-2 px-4 py-3 text-center text-[14px] font-semibold transition-colors ${
                active
                  ? "border-ptp-green text-ink"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
