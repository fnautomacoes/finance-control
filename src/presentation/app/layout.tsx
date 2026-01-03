import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Finance Control',
    template: '%s | Finance Control',
  },
  description:
    'Plataforma completa de gestão financeira e investimentos. Controle suas finanças pessoais, empresariais e investimentos em um só lugar.',
  keywords: [
    'finanças pessoais',
    'gestão financeira',
    'investimentos',
    'controle de gastos',
    'fluxo de caixa',
    'imposto de renda',
  ],
  authors: [{ name: 'Finance Control Team' }],
  creator: 'Finance Control',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Finance Control',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
