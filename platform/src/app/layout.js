export const metadata = {
  title: 'Master Waves — Plateforme de livraison',
  description: 'Portail partenaire & administration',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#f5f6f8', color: '#1a1a2e' }}>
        {children}
      </body>
    </html>
  );
}
