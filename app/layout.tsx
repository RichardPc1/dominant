import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppShell from './components/AppShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Dominant CRM',
  description: 'CRM de prospecção e clientes da Dominant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* aplica o tema escuro antes da primeira pintura, pra tela não piscar clara */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('dominant-tema')==='escuro')document.documentElement.classList.add('dark')}catch(e){}` }} />
      </head>
      <body className="text-gray-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
