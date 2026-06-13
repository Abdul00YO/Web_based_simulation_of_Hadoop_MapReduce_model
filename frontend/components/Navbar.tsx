"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/experiment", label: "Experiment" },
  { href: "/results", label: "History" },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link href="/" style={{ textDecoration: "none" }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: 18,
            background: "linear-gradient(135deg, #818cf8 0%, #34d399 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.02em",
          }}
        >
          MapReduce Sim
        </span>
      </Link>

      <div style={{ display: "flex", gap: 4 }}>
        {NAV_LINKS.map((link) => {
          const active = path === link.href;
          return (
            <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
              <span
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? "var(--accent-blue-bright)" : "var(--text-secondary)",
                  background: active ? "rgba(99,102,241,0.12)" : "transparent",
                  border: `1px solid ${active ? "rgba(99,102,241,0.3)" : "transparent"}`,
                  transition: "all 0.2s",
                  display: "inline-block",
                }}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
