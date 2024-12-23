import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets:['latin'],
  weight:['400', '600', '700']
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
