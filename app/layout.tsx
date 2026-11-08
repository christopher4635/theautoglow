import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'The Autoglow Sikkim | Car Detailing ERP & CRM',
  description: 'Complete Business Management ERP & CRM for The Autoglow Sikkim Detailing Studio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-charcoal antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
