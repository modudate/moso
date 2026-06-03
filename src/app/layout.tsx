import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "사람을 만나야 하는 모든 순간, 모두의소개팅",
  description: "모두의 소개팅 프로필 매칭 서비스",
  openGraph: {
    title: "사람을 만나야 하는 모든 순간, 모두의소개팅",
    description: "모두의 소개팅 프로필 매칭 서비스",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "사람을 만나야 하는 모든 순간, 모두의소개팅",
    description: "모두의 소개팅 프로필 매칭 서비스",
    images: ["/og.png"],
  },
  verification: {
    google: "6mJIcC3OgtWv-N3Rp0YyRX5nHsOu341p-N00u_Cr3IY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
