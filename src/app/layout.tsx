import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JPT Media Bot",
  description: "AI-powered media generation & social posting bot for Slack",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
