import Link from 'next/link';

export default function Home() {
  const card = {
    display: 'block', padding: '28px', borderRadius: 14, background: '#fff',
    textDecoration: 'none', color: '#1a1a2e', boxShadow: '0 2px 12px rgba(0,0,0,.06)',
    border: '1px solid #eee', transition: 'transform .1s',
  };
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '60px 20px' }}>
      <h1 style={{ fontSize: 38, marginBottom: 6 }}>🌊 Master Waves</h1>
      <p style={{ color: '#666', fontSize: 18, marginTop: 0 }}>
        Plateforme de livraison à domicile
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 36 }}>
        <Link href="/order" style={card}>
          <div style={{ fontSize: 30 }}>🛒</div>
          <h2 style={{ margin: '10px 0 4px' }}>Commander</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Clients : parcourez les restaurants, commandez et suivez votre livraison en temps réel.
          </p>
        </Link>
        <Link href="/pro" style={card}>
          <div style={{ fontSize: 30 }}>🛵</div>
          <h2 style={{ margin: '10px 0 4px' }}>Espace Pro</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Gérant & livreurs : dispatch des commandes, gestion des livraisons.
          </p>
        </Link>
        <Link href="/partner" style={card}>
          <div style={{ fontSize: 30 }}>🍽️</div>
          <h2 style={{ margin: '10px 0 4px' }}>Portail Partenaire</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Restaurants : gérez votre menu, vos horaires et suivez vos commandes.
          </p>
        </Link>
        <Link href="/admin" style={card}>
          <div style={{ fontSize: 30 }}>🛡️</div>
          <h2 style={{ margin: '10px 0 4px' }}>Administration</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Super admin : gestion des restaurants partenaires.
          </p>
        </Link>
      </div>
    </main>
  );
}
