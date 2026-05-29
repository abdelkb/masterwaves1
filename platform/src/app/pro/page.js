'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, saveSession, getUser, logout } from '@/lib/apiClient';

const STATUS_LABELS = {
  pending_restaurant: '🔔 À valider (restaurant)',
  preparing: '👨‍🍳 Prêt à dispatcher',
  driver_assigned: '🛵 Livreur assigné',
  going_to_restaurant: '🛵 En route vers le resto',
  picked_up: '📦 Récupérée',
  delivering: '🚗 En livraison',
  delivered: '✅ Livrée',
  cancelled: '❌ Annulée',
};

const DELIVERY_FEES = [10, 15, 20, 25, 30, 35, 40, 45, 50];

const DRIVER_NEXT = {
  driver_assigned: { next: 'going_to_restaurant', label: '🛵 Je pars vers le restaurant' },
  going_to_restaurant: { next: 'picked_up', label: '📦 Commande récupérée' },
  picked_up: { next: 'delivering', label: '🚗 Je pars livrer' },
  delivering: { next: 'delivered', label: '✅ Livraison effectuée' },
};

export default function ProApp() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('orders');
  useEffect(() => { setUser(getUser()); }, []);

  if (!user) return <AuthPage onAuth={(u) => { setUser(u); setTab(u.role === 'driver' ? 'deliveries' : 'orders'); }} />;
  if (!['manager', 'admin', 'driver'].includes(user.role)) return (
    <Centered><p>Accès réservé aux livreurs et gérants.</p><button style={btn} onClick={() => { logout(); setUser(null); }}>Déconnexion</button></Centered>
  );

  const isManager = ['manager', 'admin'].includes(user.role);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', minHeight: '100vh', background: '#f5f6f8' }}>
      <nav style={{ background: '#1a1a2e', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>🛵 Master Waves Pro</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {isManager ? [
            ['orders', '📋 Commandes'],
            ['phone', '☎️ Tél'],
            ['drivers', '👤 Livreurs'],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...navBtn, background: tab === k ? '#e94560' : 'transparent' }}>{l}</button>
          )) : (
            <button onClick={() => setTab('deliveries')} style={{ ...navBtn, background: '#e94560' }}>🛵 Mes livraisons</button>
          )}
          <button onClick={() => { logout(); setUser(null); }} style={{ ...navBtn, color: '#aaa' }}>Quitter</button>
        </div>
      </nav>
      <div style={{ padding: 16 }}>
        {tab === 'orders' && isManager && <DispatchPage />}
        {tab === 'phone' && isManager && <PhoneOrderPage />}
        {tab === 'drivers' && isManager && <DriversPage />}
        {tab === 'deliveries' && !isManager && <DeliveriesPage user={user} />}
      </div>
    </div>
  );
}

// ---------- AUTH ----------
function AuthPage({ onAuth }) {
  const [form, setForm] = useState({ email: 'manager@masterwaves.ma', password: 'manager123' });
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: form });
      if (!['manager', 'admin', 'driver'].includes(user.role)) { setError('Accès réservé aux livreurs et gérants.'); return; }
      saveSession(token, user); onAuth(user);
    } catch (e) { setError(e.message); }
  }
  return (
    <Centered>
      <div style={{ width: 360, background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,.1)' }}>
        <h1 style={{ margin: '0 0 4px' }}>🛵 Master Waves Pro</h1>
        <p style={{ color: '#888', marginTop: 0, marginBottom: 24 }}>Espace livreur & gérant</p>
        <input style={inp} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input style={inp} placeholder="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p style={{ color: '#e94560', fontSize: 14 }}>{error}</p>}
        <button style={{ ...btn, width: '100%' }} onClick={submit}>Se connecter</button>
        <p style={{ color: '#aaa', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          Démo : manager@masterwaves.ma / manager123<br />driver@masterwaves.ma / driver123
        </p>
      </div>
    </Centered>
  );
}

// ---------- DISPATCH (GÉRANT) ----------
function DispatchPage() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [modal, setModal] = useState(null);
  const [fee, setFee] = useState(null);
  const [driverId, setDriverId] = useState(null);

  const load = useCallback(() => {
    api('/orders').then((d) => setOrders(d.orders)).catch(() => {});
    api('/drivers').then((d) => setDrivers(d.drivers)).catch(() => {});
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 7000); return () => clearInterval(t); }, [load]);

  async function dispatch() {
    if (!fee || !driverId) { alert('Choisissez un prix et un livreur'); return; }
    try { await api(`/orders/${modal.id}/assign`, { method: 'POST', body: { driver_id: driverId, delivery_fee: fee } }); setModal(null); load(); }
    catch (e) { alert(e.message); }
  }
  async function cancel(id) {
    if (!confirm('Annuler cette commande ?')) return;
    try { await api(`/orders/${id}/cancel`, { method: 'POST', body: { reason: 'Annulée par le gérant' } }); load(); }
    catch (e) { alert(e.message); }
  }

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const done = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div>
      <h2>📋 Commandes ({active.length} actives)</h2>
      {active.map((o) => (
        <div key={o.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 16 }}>#{o.id} · {o.restaurant_name}</strong>
              <span style={{ marginLeft: 10, color: '#e94560', fontSize: 13 }}>{STATUS_LABELS[o.status]}</span>
            </div>
            <span style={{ fontWeight: '700' }}>{o.items_total} DH</span>
          </div>
          <div style={{ color: '#666', fontSize: 14, margin: '6px 0' }}>
            👤 {o.client_name || 'Client'} · {o.client_phone || '—'}<br />
            📍 {o.delivery_address}
          </div>
          {o.driver_name && <div style={{ color: '#2d6cdf', fontSize: 14 }}>🛵 {o.driver_name}</div>}
          {o.status === 'pending_restaurant' && <p style={{ color: '#888', fontSize: 13, margin: '6px 0' }}>En attente de validation du restaurant…</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {o.status === 'preparing' && (
              <button style={btn} onClick={() => { setModal(o); setFee(null); setDriverId(null); }}>Définir prix & dispatcher</button>
            )}
            {!['delivered', 'cancelled'].includes(o.status) && (
              <button style={{ ...btnOutline, borderColor: '#e94560', color: '#e94560' }} onClick={() => cancel(o.id)}>Annuler</button>
            )}
          </div>
        </div>
      ))}
      {!active.length && <p style={{ color: '#888' }}>Aucune commande active.</p>}

      {done.length > 0 && <>
        <h3 style={{ color: '#888' }}>Terminées ({done.length})</h3>
        {done.slice(0, 5).map((o) => (
          <div key={o.id} style={{ ...card, opacity: 0.6 }}>
            <strong>#{o.id} · {o.restaurant_name}</strong> · <span style={{ color: '#e94560' }}>{STATUS_LABELS[o.status]}</span> · {o.total} DH
          </div>
        ))}
      </>}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>Dispatcher #{modal.id}</h2>
            <h3>Prix de livraison</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DELIVERY_FEES.map((f) => (
                <button key={f} onClick={() => setFee(f)} style={{ ...btnOutline, background: fee === f ? '#1a1a2e' : '#fff', color: fee === f ? '#fff' : '#1a1a2e', padding: '8px 16px' }}>{f} DH</button>
              ))}
            </div>
            <h3>Choisir un livreur</h3>
            {drivers.map((d) => (
              <div key={d.id} onClick={() => d.is_active && setDriverId(d.id)}
                style={{ ...card, cursor: d.is_active ? 'pointer' : 'default', opacity: d.is_active ? 1 : 0.4, border: driverId === d.id ? '2px solid #1a1a2e' : '1px solid #eee', marginBottom: 8 }}>
                <strong>{d.full_name}</strong> {!d.is_active && '(inactif)'}
                <div style={{ color: '#666', fontSize: 13 }}>{d.active_orders} livraison(s) en cours</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={{ ...btn, flex: 2 }} onClick={dispatch}>✅ Confirmer</button>
              <button style={{ ...btnOutline, flex: 1 }} onClick={() => setModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- COMMANDE TÉLÉPHONIQUE ----------
function PhoneOrderPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [info, setInfo] = useState({ client_name: '', client_phone: '', delivery_address: '' });
  const [fee, setFee] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => { api('/restaurants').then((d) => setRestaurants(d.restaurants)).catch(() => {}); }, []);

  async function pickRestaurant(r) {
    setRestaurant(r); setCart({});
    const d = await api(`/restaurants/${r.id}`);
    setProducts(d.products);
  }
  const inc = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id) => setCart((c) => { const n = { ...c }; n[id]--; if (!n[id]) delete n[id]; return n; });
  const items = Object.entries(cart).map(([pid, qty]) => ({ product_id: Number(pid), quantity: qty }));

  async function submit() {
    if (!restaurant || !items.length) { alert('Choisissez un restaurant et des articles'); return; }
    if (!info.delivery_address) { alert('Adresse requise'); return; }
    try {
      const { id } = await api('/orders', { method: 'POST', body: { restaurant_id: restaurant.id, items, ...info, delivery_fee: fee || undefined } });
      setSuccess(`✅ Commande #${id} créée. Dispatchez-la depuis l'onglet Commandes.`);
      setCart({}); setInfo({ client_name: '', client_phone: '', delivery_address: '' }); setFee(null);
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <h2>☎️ Commande téléphonique</h2>
      {success && <div style={{ background: '#f0fff8', color: '#0a7', padding: 12, borderRadius: 10, marginBottom: 16 }}>{success}</div>}
      <h3>Restaurant</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {restaurants.map((r) => (
          <button key={r.id} onClick={() => pickRestaurant(r)} style={{ ...btnOutline, background: restaurant?.id === r.id ? '#1a1a2e' : '#fff', color: restaurant?.id === r.id ? '#fff' : '#1a1a2e' }}>{r.name}</button>
        ))}
      </div>
      {products.length > 0 && <>
        <h3>Articles</h3>
        {products.map((p) => (
          <div key={p.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
            <span>{p.name} — {p.price} DH</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button style={qtyBtn} onClick={() => dec(p.id)}>−</button>
              <span style={{ fontWeight: '700', minWidth: 20, textAlign: 'center' }}>{cart[p.id] || 0}</span>
              <button style={qtyBtn} onClick={() => inc(p.id)}>+</button>
            </div>
          </div>
        ))}
      </>}
      <h3>Infos client</h3>
      <input style={inp} placeholder="Nom du client" value={info.client_name} onChange={(e) => setInfo({ ...info, client_name: e.target.value })} />
      <input style={inp} placeholder="Téléphone" value={info.client_phone} onChange={(e) => setInfo({ ...info, client_phone: e.target.value })} />
      <textarea style={{ ...inp, height: 70 }} placeholder="Adresse de livraison" value={info.delivery_address} onChange={(e) => setInfo({ ...info, delivery_address: e.target.value })} />
      <h3>Prix livraison (optionnel)</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {DELIVERY_FEES.map((f) => (
          <button key={f} onClick={() => setFee(fee === f ? null : f)} style={{ ...btnOutline, background: fee === f ? '#1a1a2e' : '#fff', color: fee === f ? '#fff' : '#1a1a2e', padding: '7px 14px' }}>{f} DH</button>
        ))}
      </div>
      <button style={{ ...btn, width: '100%' }} onClick={submit}>Créer la commande</button>
    </div>
  );
}

// ---------- LIVREURS (GÉRANT) ----------
function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [success, setSuccess] = useState('');
  const load = useCallback(() => { api('/drivers').then((d) => setDrivers(d.drivers)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) { alert('Nom, email et mot de passe requis'); return; }
    try { await api('/drivers', { method: 'POST', body: form }); setSuccess(`✅ Compte créé pour ${form.full_name}`); setForm({ full_name: '', email: '', phone: '', password: '' }); load(); }
    catch (e) { alert(e.message); }
  }
  async function toggle(d) {
    try { await api(`/drivers/${d.id}`, { method: 'PATCH', body: { is_active: d.is_active ? 0 : 1 } }); load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <h2>👤 Gestion des livreurs</h2>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Ajouter un livreur</h3>
        {success && <div style={{ background: '#f0fff8', color: '#0a7', padding: 10, borderRadius: 8, marginBottom: 10 }}>{success}</div>}
        <form onSubmit={create}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input style={inp} placeholder="Nom complet *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <input style={inp} placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input style={inp} placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input style={inp} placeholder="Mot de passe *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button style={btn} type="submit">Créer le compte livreur</button>
        </form>
      </div>
      {drivers.map((d) => (
        <div key={d.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{d.full_name}</strong>
            <div style={{ color: '#666', fontSize: 14 }}>{d.email} · {d.active_orders} livraison(s) en cours</div>
          </div>
          <button onClick={() => toggle(d)} style={{ ...btnOutline, background: d.is_active ? '#f0fff8' : '#fff', color: d.is_active ? '#0a7' : '#e94560', borderColor: d.is_active ? '#0a7' : '#e94560' }}>
            {d.is_active ? '✅ Actif' : '⛔ Inactif'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- LIVRAISONS (LIVREUR) ----------
function DeliveriesPage({ user }) {
  const [orders, setOrders] = useState([]);
  const load = useCallback(() => {
    api('/orders').then((d) => setOrders(d.orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)))).catch(() => {});
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 7000); return () => clearInterval(t); }, [load]);

  async function advance(order) {
    const step = DRIVER_NEXT[order.status];
    if (!step) return;
    try { await api(`/orders/${order.id}/status`, { method: 'POST', body: { status: step.next } }); load(); }
    catch (e) { alert(e.message); }
  }

  function navigate(order) {
    const goingToResto = ['driver_assigned', 'going_to_restaurant'].includes(order.status);
    const dest = goingToResto
      ? (order.restaurant_lat ? `${order.restaurant_lat},${order.restaurant_lng}` : encodeURIComponent(order.restaurant_name))
      : (order.delivery_lat ? `${order.delivery_lat},${order.delivery_lng}` : encodeURIComponent(order.delivery_address));
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
  }

  return (
    <div>
      <h2>🛵 Mes livraisons ({orders.length})</h2>
      {orders.map((o) => {
        const step = DRIVER_NEXT[o.status];
        const goingToResto = ['driver_assigned', 'going_to_restaurant'].includes(o.status);
        return (
          <div key={o.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>#{o.id} · {o.restaurant_name}</strong>
              <span style={{ fontWeight: '700', color: '#2d6cdf' }}>{o.total} DH</span>
            </div>
            <div style={{ color: '#e94560', margin: '4px 0' }}>{STATUS_LABELS[o.status]}</div>
            <div style={{ color: '#666', fontSize: 14 }}>
              {goingToResto ? `🏪 ${o.restaurant_name}` : `📍 ${o.delivery_address}`}
            </div>
            {!goingToResto && <div style={{ color: '#888', fontSize: 13 }}>👤 {o.client_name} · {o.client_phone}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button style={{ ...btnOutline, flex: 1 }} onClick={() => navigate(o)}>🧭 Naviguer</button>
              {step && <button style={{ ...btn, flex: 2 }} onClick={() => advance(o)}>{step.label}</button>}
            </div>
          </div>
        );
      })}
      {!orders.length && <p style={{ color: '#888' }}>Aucune livraison assignée pour le moment.</p>}
    </div>
  );
}

// ---------- UI ----------
function Centered({ children }) { return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8' }}>{children}</div>; }
const card = { background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid #eee' };
const inp = { display: 'block', width: '100%', padding: '11px 13px', margin: '4px 0 12px', borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 15 };
const btn = { background: '#1a1a2e', color: '#fff', border: 'none', padding: '11px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: '700', fontSize: 14 };
const btnOutline = { background: '#fff', color: '#1a1a2e', border: '1px solid #ddd', padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: '700', fontSize: 14 };
const navBtn = { color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: '600' };
const qtyBtn = { background: '#f0f0f0', border: 'none', width: 34, height: 34, borderRadius: 8, fontSize: 20, cursor: 'pointer', fontWeight: '700' };
