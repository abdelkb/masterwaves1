'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, saveSession, getUser, logout } from '@/lib/apiClient';

export default function Admin() {
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getUser()); }, []);
  if (!user) return <Login onLogin={setUser} />;
  if (user.role !== 'admin')
    return <Centered>Réservé au super admin. <a href="#" onClick={() => { logout(); setUser(null); }}>Déconnexion</a></Centered>;
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🛡️ Administration</h1>
        <button onClick={() => { logout(); setUser(null); }} style={btnGhost}>Déconnexion</button>
      </header>
      <Restaurants />
    </div>
  );
}

function Restaurants() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const load = useCallback(async () => {
    const { restaurants } = await api('/restaurants');
    setList(restaurants);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function add(e) {
    e.preventDefault();
    await api('/restaurants', { method: 'POST', body: form });
    setForm({ name: '', phone: '', address: '' });
    load();
  }
  return (
    <div>
      <Card>
        <h3 style={{ marginTop: 0 }}>Ajouter un restaurant partenaire</h3>
        <form onSubmit={add} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: 2, marginBottom: 0 }} placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input style={{ ...input, flex: 1, marginBottom: 0 }} placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input style={{ ...input, flex: 2, marginBottom: 0 }} placeholder="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <button style={btnActive}>Ajouter</button>
        </form>
      </Card>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {list.map((r) => (
          <Card key={r.id}>
            <strong>{r.name}</strong> — {r.address || '—'}
            <span style={{ float: 'right', color: r.is_open ? '#0a7' : '#d33' }}>{r.is_open ? 'Ouvert' : 'Fermé'}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

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
      <form onSubmit={submit} style={{ width: 340, background: '#fff', padding: 28, borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,.08)' }}>
        <h2 style={{ marginTop: 0 }}>🛡️ Administration</h2>
        <input style={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={input} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p style={{ color: '#d33', fontSize: 14 }}>{error}</p>}
        <button style={{ ...btnActive, width: '100%', marginTop: 8 }}>Se connecter</button>
      </form>
    </Centered>
  );
}

function Card({ children }) { return <div style={{ background: '#fff', padding: 18, borderRadius: 12, border: '1px solid #eee' }}>{children}</div>; }
function Centered({ children }) { return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>{children}</div>; }
const input = { display: 'block', width: '100%', padding: '10px 12px', margin: '6px 0', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' };
const btn = { padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const btnActive = { ...btn, background: '#1a1a2e', color: '#fff', border: '1px solid #1a1a2e' };
const btnGhost = { ...btn, color: '#555' };
