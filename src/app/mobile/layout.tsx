import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Karaoke Controller',
  description: 'Điều khiển Karaoke TV từ điện thoại',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0f',
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
