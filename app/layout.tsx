import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Santa's Helper • AI Gift List",
  description: "Kid-friendly AI helper that builds a magical gift wishlist and emails it to parents."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="gradient-bg min-h-screen">
        {children}
      </body>
    </html>
  );
}
