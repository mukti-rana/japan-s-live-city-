import type { Metadata } from "next";
import { Space_Grotesk, Noto_Sans_JP } from "next/font/google";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Live City Japan",
  description: "Everything you need to live, work & travel in Japan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${notoSansJp.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <TopBar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="min-w-0 flex-1 p-3 pb-24 sm:p-4 lg:pb-4">
            {children}
          </main>
        </div>
        <Footer />
      </body>
    </html>
  );
}
