import type {Metadata} from 'next';
import {Outfit, Plus_Jakarta_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
});

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
      className={`${outfit.variable} ${jakarta.variable} ${jetbrainsMono.variable} dark`}
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
