import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dominant – Funil de Prospecção',
  description: 'Funil de prospecção B2B do Coletor Dominant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
