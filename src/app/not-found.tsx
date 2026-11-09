import Link from 'next/link';

/** Paths outside /lo and /en (rare: the proxy adds a locale to almost everything). */
export default function RootNotFound() {
  return (
    <html lang="lo">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <p>
          ບໍ່ພົບໜ້ານີ້ · Page not found — <Link href="/lo/dashboard">SYSTORY HRMS</Link>
        </p>
      </body>
    </html>
  );
}
