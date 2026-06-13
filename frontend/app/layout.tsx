import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MapReduce Simulator | PDC Performance Platform",
  description:
    "Web-based simulation and performance optimization of MapReduce using Parallel and Distributed Computing techniques. Compare baseline Hadoop-style processing against in-memory parallel execution.",
  keywords: "MapReduce, Hadoop, parallel computing, distributed systems, performance optimization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="bg-grid" />
        {children}
      </body>
    </html>
  );
}
