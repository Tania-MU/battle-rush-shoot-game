import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Heartdrop Royale — 3D Dating Battle Royale',
  description:
    'A vibrant 3D third-person multiplayer dating battle royale where 10 solo contenders scavenge weapons, summon Cute Virtual Girl or Dog helper bots from free vending machines, survive a shrinking storm, and compete in compatibility challenges to win virtual dates.',
  openGraph: {
    title: 'Heartdrop Royale — 3D Dating Battle Royale',
    description:
      'Compete in 10-player solo battle royale matches with 200 HP, free vending machines, shrinking storms, and unlockable Cute Virtual Girl helper bots.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Heartdrop Royale — 3D Dating Battle Royale',
    description:
      'Compete in 10-player solo battle royale matches with 200 HP, free vending machines, shrinking storms, and unlockable Cute Virtual Girl helper bots.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      className="dark [--font-display:system-ui,-apple-system,sans-serif] [--font-sans:system-ui,-apple-system,sans-serif] [--font-mono:ui-monospace,SFMono-Regular,monospace]"
    >
      <body
        suppressHydrationWarning
        className="bg-[#0B0F19] text-slate-100 font-sans antialiased overflow-hidden select-none"
      >
        {children}
      </body>
    </html>
  );
}
