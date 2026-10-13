import type { Metadata } from 'next';
import './globals.css';
import AppNav from './components/AppNav';

export const metadata: Metadata = {
  title: 'Dominant CRM',
  description: 'CRM de prospecção e clientes da Dominant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
