export const metadata = {
  title: 'Tuition Manager API',
  description: 'REST API backend for the Tuition Management Android App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
