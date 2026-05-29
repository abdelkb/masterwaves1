'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, saveSession, getUser, logout } from '@/lib/apiClient';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('partners');
  useEffect(() => { setUser(getUser()); }, []);
  if (!user) return <Login onLogin={setUser} />;
  if (user.role !== 'admin')
    return <Centered>Réservé au super admin. <a href="#" onClick={() => { logout(); setUser(null); }}>Déconnexion</a></Centered>;
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>🛡️ Administration</h1>
        <button onClick={() => { logout(); setUser(null); }} style={btnGhost}>Déconnexion</button>
      </header>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['partners', '🍽️ Partenaires'], ['restaurants', '📋 Restaurants']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={tab === k ? btnActive : btn}>{l}</button>
        ))}
      </nav>
      {tab === 'partners' && <Partners />}
      {tab === 'restaurants' && <Restaurants />}
    </div>
  );
}

// ---------- GESTION DES PARTENAIRES ----------
function Partners() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ restaurant_name: '', full_name: '', email: '', phone: '', password: '', restaurant_phone: '', restaurant_address: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try { const { partners } = await api('/admin/partners'); setList(partners); } catch (e) {}
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api('/admin/partners', { method: 'POST', body: form });
      setSuccess(`✅ Compte créé pour ${form.restaurant_name}. Email : ${form.email} / MDP : ${form.password}`);
      setForm({ restaurant_name: '', full_name: '', email: '', phone: '', password: '', restaurant_phone: '', restaurant_address: '' });
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <Card>
        <h3 style={{ marginTop: 0 }}>Créer un compte partenaire</h3>
        <p style={{ color: '#888', fontSize: 14, marginTop: -8 }}>
          Crée simultanément le compte de connexion du restaurant ET sa fiche dans la plateforme.
        </p>
        <form onSubmit={add}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={label}>Nom du restaurant *</label>
              <input style={input} placeholder="Ex: Pizza Bella" value={form.restaurant_name} onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} required />
            </div>
            <div>
              <label style={label}>Nom du gérant</label>
              <input style={input} placeholder="Ex: Mohammed Alami" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label style={label}>Email de connexion *</label>
              <input style={input} type="email" placeholder="restaurant@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label style={label}>Mot de passe *</label>
              <input style={input} placeholder="Minimum 6 caractères" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div>
              <label style={label}>Téléphone restaurant</label>
              <input style={input} placeholder="0522..." value={form.restaurant_phone} onChange={(e) => setForm({ ...form, restaurant_phone: e.target.value })} />
            </div>
            <div>
              <label style={label}>Adresse restaurant</label>
              <input style={input} placeholder="Rue, ville" value={form.restaurant_address} onChange={(e) => setForm({ ...form, restaurant_address: e.target.value })} />
            </div>
          </div>
          {error && <p style={{ color: '#d33', fontSize: 14, margin: '8px 0' }}>{error}</p>}
          {success && <p style={{ color: '#0a7', fontSize: 14, margin: '8px 0', background: '#f0fff8', padding: 10, borderRadius: 8 }}>{success}</p>}
          <button style={{ ...btnActive, marginTop: 8 }}>Créer le compte partenaire</button>
        </form>
      </Card>

      <h3>Partenaires existants ({list.length})</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map((p) => (
          <Card key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{p.restaurant_name || '—'}</strong>
                <span style={{ marginLeft: 10, color: p.restaurant_status === 'active' ? '#0a7' : '#d33', fontSize: 13 }}>
                  {p.restaurant_status === 'active' ? '● Actif' : '● Inactif'}
                </span>
                <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
                  👤 {p.full_name} · 📧 {p.email}
                </div>
                {p.address && <div style={{ color: '#888', fontSize: 13 }}>📍 {p.address}</div>}
              </div>
              <span style={{ color: p.is_open ? '#0a7' : '#d33', fontSize: 13 }}>{p.is_open ? 'Ouvert' : 'Fermé'}</span>
            </div>
          </Card>
        ))}
        {!list.length && <p style={{ color: '#888' }}>Aucun partenaire pour le moment.</p>}
      </div>
    </div>
  );
}

// ---------- LISTE RESTAURANTS (vue simple) ----------
function Restaurants() {
  const [list, setList] = useState([]);
  const load = useCallback(async () => {
    try { const { restaurants } = await api('/restaurants'); setList(restaurants); } catch (e) {}
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map((r) => (
          <Card key={r.id}>
            <strong>{r.name}</strong> — {r.address || '—'}
            <span style={{ float: 'right', color: r.is_open ? '#0a7' : '#d33' }}>{r.is_open ? 'Ouvert' : 'Fermé'}</span>
          </Card>
        ))}
        {!list.length && <p style={{ color: '#888' }}>Aucun restaurant.</p>}
      </div>
    </div>
  );
}

// ---------- LOGIN ----------
function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@masterwaves.ma');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      saveSession(token, user); onLogin(user);
    } catch (e) { setError(e.message); }
  }
  return (
    <Centered>
      <form onSubmit={submit} style={{ width: 360, background: '#fff', padding: 28, borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,.08)' }}>
        <h2 style={{ marginTop: 0 }}>🛡️ Administration</h2>
        <input style={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={input} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p style={{ color: '#d33', fontSize: 14 }}>{error}</p>}
        <button style={{ ...btnActive, width: '100%', marginTop: 8 }}>Se connecter</button>
      </form>
    </Centered>
  );
}

// ---------- UI HELPERS ----------
function Card({ children }) { return <div style={{ background: '#fff', padding: 18, borderRadius: 12, border: '1px solid #eee' }}>{children}</div>; }
function Centered({ children }) { return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>{children}</div>; }
const label = { display: 'block', fontSize: 13, color: '#555', marginBottom: 2 };
const input = { display: 'block', width: '100%', padding: '10px 12px', margin: '0 0 4px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' };
const btn = { padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const btnActive = { ...btn, background: '#1a1a2e', color: '#fff', border: '1px solid #1a1a2e' };
const btnGhost = { ...btn, color: '#555' };
