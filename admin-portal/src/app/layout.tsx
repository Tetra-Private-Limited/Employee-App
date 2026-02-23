import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Employee Tracker - Admin Portal',
  description: 'Admin dashboard for employee tracking system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
