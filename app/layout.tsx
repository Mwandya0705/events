import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Globo Expats · Venue Layout",
  description: "3D venue visualization for the networking & exhibition event",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#050608" }}>
        {children}
      </body>
    </html>
  );
}
