'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, saveSession, getUser, logout } from '@/lib/apiClient';

const ORDER_LABELS = {
  pending_restaurant: '🔔 À valider',
  preparing: '👨‍🍳 En préparation',
  driver_assigned: '🛵 Livreur assigné',
  going_to_restaurant: '🛵 Livreur en route',
  picked_up: '📦 Récupérée',
  delivering: '🚗 En livraison',
  delivered: '✅ Livrée',
  cancelled: '❌ Annulée',
};

export default function PartnerPortal() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('orders');

  useEffect(() => { setUser(getUser()); }, []);

  if (!user) return <Login onLogin={setUser} />;
  if (user.role !== 'restaurant')
    return <Centered>Ce portail est réservé aux restaurants partenaires. <a href="#" onClick={() => { logout(); setUser(null); }}>Se déconnecter</a></Centered>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>🍽️ {user.full_name}</h1>
        <button onClick={() => { logout(); setUser(null); }} style={btnGhost}>Déconnexion</button>
      </header>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['orders', 'Commandes'], ['menu', 'Menu'], ['import', 'Import CSV'], ['profile', 'Profil & Horaires']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={tab === k ? btnActive : btn}>{l}</button>
        ))}
      </nav>
      {tab === 'orders' && <Orders />}
      {tab === 'menu' && <Menu />}
      {tab === 'import' && <CsvImport />}
      {tab === 'profile' && <Profile />}
    </div>
  );
}

// ---------------- LOGIN ----------------
function Login({ onLogin }) {
  const [email, setEmail] = useState('resto@masterwaves.ma');
  const [password, setPassword] = useState('resto123');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      saveSession(token, user);
      onLogin(user);
    } catch (e) { setError(e.message); }
  }
  return (
    <Centered>
      <form onSubmit={submit} style={{ width: 340, background: '#fff', padding: 28, borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,.08)' }}>
        <h2 style={{ marginTop: 0 }}>🍽️ Portail Partenaire</h2>
        <p style={{ color: '#888', marginTop: -8, fontSize: 14 }}>Connexion restaurant</p>
        <input style={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={input} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p style={{ color: '#d33', fontSize: 14 }}>{error}</p>}
        <button style={{ ...btnActive, width: '100%', marginTop: 8 }}>Se connecter</button>
      </form>
    </Centered>
  );
}

// ---------------- COMMANDES ----------------
function Orders() {
  const [orders, setOrders] = useState([]);
  const load = useCallback(async () => {
    const { orders } = await api('/orders');
    setOrders(orders);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function validate(id) {
    await api(`/orders/${id}/status`, { method: 'POST', body: { status: 'preparing' } });
    load();
  }
  async function cancel(id) {
    if (!confirm('Annuler cette commande ?')) return;
    await api(`/orders/${id}/cancel`, { method: 'POST', body: { reason: 'Refusée par le restaurant' } });
    load();
  }

  if (!orders.length) return <Card>Aucune commande pour le moment.</Card>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {orders.map((o) => (
        <Card key={o.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>Commande #{o.id}</strong>
            <span>{ORDER_LABELS[o.status] || o.status}</span>
          </div>
          <div style={{ color: '#666', fontSize: 14, margin: '6px 0' }}>
            {o.client_name || 'Client'} · {o.client_phone || '—'}<br />
            📍 {o.delivery_address}<br />
            Total articles : <strong>{o.items_total} DH</strong>
          </div>
          {o.status === 'pending_restaurant' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnActive} onClick={() => validate(o.id)}>✅ Valider & préparer</button>
              <button style={btnGhost} onClick={() => cancel(o.id)}>Refuser</button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------------- MENU ----------------
function Menu() {
  const [rid, setRid] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', description: '' });

  const load = useCallback(async () => {
    const { restaurants } = await api('/restaurants');
    // Le restaurant connecté : on charge via /orders pour récupérer son id n'est pas idéal.
    // On récupère plutôt le 1er resto actif lié — pour la démo on liste tous puis filtre côté API produits.
    // Ici on utilise l'endpoint produits avec restaurant_id détecté côté serveur (POST sans id).
    // Pour l'affichage on tente de retrouver le resto par owner via un appel dédié.
    const me = await api('/me');
    if (me.restaurant) {
      setRid(me.restaurant.id);
      const { products } = await api(`/products?restaurant_id=${me.restaurant.id}`);
      setProducts(products);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    await api('/products', { method: 'POST', body: { name: form.name, price: parseFloat(form.price), description: form.description } });
    setForm({ name: '', price: '', description: '' });
    load();
  }
  async function toggleStock(p) {
    await api(`/products/${p.id}`, { method: 'PATCH', body: { in_stock: p.in_stock ? 0 : 1 } });
    load();
  }
  async function del(id) {
    if (!confirm('Supprimer ce produit ?')) return;
    await api(`/products/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <Card>
        <h3 style={{ marginTop: 0 }}>Ajouter un produit</h3>
        <form onSubmit={add} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: 2, marginBottom: 0 }} placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input style={{ ...input, flex: 1, marginBottom: 0 }} type="number" placeholder="Prix DH" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input style={{ ...input, flex: 2, marginBottom: 0 }} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button style={btnActive}>Ajouter</button>
        </form>
      </Card>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {products.map((p) => (
          <Card key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{p.name}</strong> — {p.price} DH
                {!p.in_stock && <span style={{ color: '#d33', marginLeft: 8 }}>(rupture)</span>}
                <div style={{ color: '#888', fontSize: 13 }}>{p.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={btnGhost} onClick={() => toggleStock(p)}>{p.in_stock ? 'Rupture' : 'Réactiver'}</button>
                <button style={btnGhost} onClick={() => del(p.id)}>🗑️</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------- IMPORT CSV ----------------
function CsvImport() {
  const [csv, setCsv] = useState('name,description,price,category\nPizza Reine,Champignons jambon,65,Pizzas');
  const [result, setResult] = useState(null);

  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(reader.result);
    reader.readAsText(f);
  }
  async function importNow() {
    setResult(null);
    const r = await api('/products/import', { method: 'POST', body: { csv } });
    setResult(r);
  }
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Import de produits par CSV</h3>
      <p style={{ color: '#666', fontSize: 14 }}>
        Colonnes : <code>name, description, price, category</code> (1ère ligne = en-têtes).
        Les catégories manquantes sont créées automatiquement.
      </p>
      <input type="file" accept=".csv" onChange={onFile} style={{ marginBottom: 10 }} />
      <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} style={{ width: '100%', fontFamily: 'monospace', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
      <button style={{ ...btnActive, marginTop: 10 }} onClick={importNow}>Importer</button>
      {result && (
        <div style={{ marginTop: 12, color: '#0a7' }}>
          ✅ {result.imported} produit(s) importé(s).
          {result.errors?.length > 0 && (
            <ul style={{ color: '#d33' }}>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------- PROFIL ----------------
function Profile() {
  const [r, setR] = useState(null);
  const [form, setForm] = useState({});
  useEffect(() => {
    api('/me').then((me) => { if (me.restaurant) { setR(me.restaurant); setForm(me.restaurant); } });
  }, []);
  if (!r) return <Card>Chargement…</Card>;
  async function save() {
    await api(`/restaurants/${r.id}`, { method: 'PATCH', body: {
      name: form.name, description: form.description, phone: form.phone,
      address: form.address, logo_url: form.logo_url, is_open: form.is_open,
    } });
    alert('Profil mis à jour');
  }
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Profil du commerce</h3>
      {['name', 'description', 'phone', 'address', 'logo_url'].map((f) => (
        <input key={f} style={input} placeholder={f} value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
      ))}
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input type="checkbox" checked={!!form.is_open} onChange={(e) => setForm({ ...form, is_open: e.target.checked ? 1 : 0 })} /> Commerce ouvert
      </label>
      <button style={btnActive} onClick={save}>Enregistrer</button>
    </Card>
  );
}

// ---------------- UI helpers ----------------
function Card({ children }) {
  return <div style={{ background: '#fff', padding: 18, borderRadius: 12, border: '1px solid #eee' }}>{children}</div>;
}
function Centered({ children }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>{children}</div>;
}
const input = { display: 'block', width: '100%', padding: '10px 12px', margin: '6px 0', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' };
const btn = { padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const btnActive = { ...btn, background: '#1a1a2e', color: '#fff', border: '1px solid #1a1a2e' };
const btnGhost = { ...btn, color: '#555' };
