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

  function handleAuth(u) {
    setUser(u);
    setTab(u.role === 'driver' ? 'deliveries' : 'orders');
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;
  if (!['manager', 'admin', 'driver'].includes(user.role))
    return <Centered><p>Accès réservé aux livreurs et gérants.</p><button style={btn} onClick={() => { logout(); setUser(null); }}>Déconnexion</button></Centered>;

  const isManager = ['manager', 'admin'].includes(user.role);
  const isAdmin = user.role === 'admin';

  // Onglets selon le rôle
  const tabs = isManager ? [
    ['orders',   '📋 Commandes'],
    ['phone',    '☎️ Tél'],
    ['drivers',  '👤 Livreurs'],
    ...(isAdmin ? [['partners', '🍽️ Partenaires']] : []),
  ] : [
    ['deliveries', '🛵 Mes livraisons'],
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', minHeight: '100vh', background: '#f5f6f8' }}>
      {/* NAV */}
      <nav style={{ background: '#1a1a2e', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>🛵 Master Waves Pro</span>
          <span style={{ color: '#aaa', fontSize: 12, marginLeft: 10 }}>{user.full_name} · {user.role}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...navBtn, background: tab === k ? '#e94560' : 'transparent' }}>{l}</button>
          ))}
          <button onClick={() => { logout(); setUser(null); }} style={{ ...navBtn, color: '#aaa' }}>Quitter</button>
        </div>
      </nav>

      <div style={{ padding: 16 }}>
        {tab === 'orders'     && isManager  && <DispatchPage />}
        {tab === 'phone'      && isManager  && <PhoneOrderPage />}
        {tab === 'drivers'    && isManager  && <DriversPage />}
        {tab === 'partners'   && isAdmin    && <PartnersPage />}
        {tab === 'deliveries' && !isManager && <DeliveriesPage />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: form });
      if (!['manager', 'admin', 'driver'].includes(user.role)) {
        setError('Accès réservé aux livreurs et gérants.');
        return;
      }
      saveSession(token, user); onAuth(user);
    } catch (e) { setError(e.message); }
  }
  return (
    <Centered>
      <div style={{ width: 360, background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,.1)' }}>
        <h1 style={{ margin: '0 0 4px' }}>🛵 Master Waves Pro</h1>
        <p style={{ color: '#888', marginTop: 0, marginBottom: 24 }}>Espace livreur, gérant & admin</p>
        <input style={inp} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input style={inp} placeholder="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p style={{ color: '#e94560', fontSize: 14 }}>{error}</p>}
        <button style={{ ...btn, width: '100%' }} onClick={submit}>Se connecter</button>
        <p style={{ color: '#aaa', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          admin@masterwaves.ma / admin123<br />
          manager@masterwaves.ma / manager123<br />
          driver@masterwaves.ma / driver123
        </p>
      </div>
    </Centered>
  );
}

// ─────────────────────────────────────────────
// DISPATCH (manager + admin)
// ─────────────────────────────────────────────
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
    try {
      await api(`/orders/${modal.id}/assign`, { method: 'POST', body: { driver_id: driverId, delivery_fee: fee } });
      setModal(null); load();
    } catch (e) { alert(e.message); }
  }

  async function cancel(id) {
    if (!confirm('Annuler cette commande ?')) return;
    try { await api(`/orders/${id}/cancel`, { method: 'POST', body: { reason: 'Annulée par le gérant' } }); load(); }
    catch (e) { alert(e.message); }
  }

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const done   = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  // Stats rapides
  const stats = {
    total: orders.length,
    active: active.length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    revenue: orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0),
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          ['📦', 'Total', stats.total],
          ['⚡', 'En cours', stats.active],
          ['✅', 'Livrées', stats.delivered],
          ['💰', 'Revenus', stats.revenue + ' DH'],
        ].map(([icon, label, val]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #eee', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontWeight: '800', fontSize: 20 }}>{val}</div>
            <div style={{ color: '#888', fontSize: 13 }}>{label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ margin: '0 0 12px' }}>Commandes actives ({active.length})</h2>
      {active.map((o) => (
        <div key={o.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 16 }}>#{o.id} · {o.restaurant_name}</strong>
              <span style={{ marginLeft: 10, color: '#e94560', fontSize: 13 }}>{STATUS_LABELS[o.status]}</span>
            </div>
            <span style={{ fontWeight: '700' }}>{o.items_total} DH articles{o.delivery_fee ? ` + ${o.delivery_fee} DH livraison` : ''}</span>
          </div>
          <div style={{ color: '#666', fontSize: 14, margin: '6px 0' }}>
            👤 {o.client_name || 'Client'} · {o.client_phone || '—'}<br />
            📍 {o.delivery_address}
          </div>
          {o.driver_name && <div style={{ color: '#2d6cdf', fontSize: 14 }}>🛵 {o.driver_name}</div>}
          {o.status === 'pending_restaurant' && <p style={{ color: '#888', fontSize: 13, margin: '6px 0 0' }}>En attente de validation du restaurant…</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {o.status === 'preparing' && (
              <button style={btn} onClick={() => { setModal(o); setFee(null); setDriverId(null); }}>
                Définir prix & dispatcher →
              </button>
            )}
            {!['delivered', 'cancelled'].includes(o.status) && (
              <button style={{ ...btnOutline, borderColor: '#e94560', color: '#e94560' }} onClick={() => cancel(o.id)}>Annuler</button>
            )}
          </div>
        </div>
      ))}
      {!active.length && <p style={{ color: '#888' }}>Aucune commande active.</p>}

      {done.length > 0 && (
        <>
          <h3 style={{ color: '#888', marginTop: 24 }}>Terminées ({done.length})</h3>
          {done.slice(0, 10).map((o) => (
            <div key={o.id} style={{ ...card, opacity: 0.6, padding: '10px 16px' }}>
              <span style={{ fontWeight: '700' }}>#{o.id} · {o.restaurant_name}</span>
              <span style={{ color: '#e94560', marginLeft: 10, fontSize: 13 }}>{STATUS_LABELS[o.status]}</span>
              <span style={{ float: 'right', fontWeight: '700' }}>{o.total} DH</span>
            </div>
          ))}
        </>
      )}

      {/* Modal dispatch */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>Dispatcher commande #{modal.id}</h2>
            <p style={{ color: '#666' }}>
              👤 {modal.client_name} · 📍 {modal.delivery_address}<br />
              Articles : <strong>{modal.items_total} DH</strong>
            </p>
            <h3>Prix de livraison</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {DELIVERY_FEES.map((f) => (
                <button key={f} onClick={() => setFee(f)}
                  style={{ ...btnOutline, background: fee === f ? '#1a1a2e' : '#fff', color: fee === f ? '#fff' : '#1a1a2e', padding: '8px 16px' }}>
                  {f} DH
                </button>
              ))}
            </div>
            {fee && <p style={{ color: '#0a7', fontWeight: '700' }}>Total client : {modal.items_total + fee} DH</p>}
            <h3>Choisir un livreur</h3>
            {drivers.length === 0 && <p style={{ color: '#e94560' }}>Aucun livreur actif. Créez-en un dans l'onglet Livreurs.</p>}
            {drivers.map((d) => (
              <div key={d.id} onClick={() => d.is_active && setDriverId(d.id)}
                style={{ ...card, cursor: d.is_active ? 'pointer' : 'default', opacity: d.is_active ? 1 : 0.4, border: driverId === d.id ? '2px solid #1a1a2e' : '1px solid #eee', marginBottom: 8 }}>
                <strong>{d.full_name}</strong>{!d.is_active && ' (inactif)'}
                <div style={{ color: '#666', fontSize: 13 }}>{d.active_orders} livraison(s) en cours · {d.phone || d.email}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={{ ...btn, flex: 2 }} onClick={dispatch}>✅ Confirmer le dispatch</button>
              <button style={{ ...btnOutline, flex: 1 }} onClick={() => setModal(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMMANDE TÉLÉPHONIQUE (manager + admin)
// ─────────────────────────────────────────────
function PhoneOrderPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [info, setInfo] = useState({ client_name: '', client_phone: '', delivery_address: '', delivery_details: '', delivery_note: '' });
  const [fee, setFee] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => { api('/restaurants').then((d) => setRestaurants(d.restaurants)).catch(() => {}); }, []);

  async function pickRestaurant(r) {
    setRestaurant(r); setCart({});
    const d = await api(`/restaurants/${r.id}`);
    setProducts(d.products);
  }
  const inc = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id) => setCart((c) => { const n = { ...c }; n[id]--; if (n[id] <= 0) delete n[id]; return n; });
  const items = Object.entries(cart).map(([pid, qty]) => ({ product_id: Number(pid), quantity: qty }));
  const subtotal = items.reduce((s, it) => {
    const p = products.find((p) => p.id === Number(it.product_id));
    return s + (p ? p.price * it.quantity : 0);
  }, 0);

  async function submit() {
    if (!restaurant || !items.length) { alert('Choisissez un restaurant et des articles'); return; }
    if (!info.delivery_address) { alert('Adresse requise'); return; }
    try {
      const { id } = await api('/orders', { method: 'POST', body: { restaurant_id: restaurant.id, items, ...info, delivery_fee: fee || undefined } });
      setSuccess(`✅ Commande #${id} créée — allez dans Commandes pour dispatcher.`);
      setCart({}); setInfo({ client_name: '', client_phone: '', delivery_address: '', delivery_details: '', delivery_note: '' }); setFee(null);
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <h2>☎️ Nouvelle commande téléphonique</h2>
      {success && <div style={{ background: '#f0fff8', color: '#0a7', padding: 14, borderRadius: 12, marginBottom: 16, fontWeight: '600' }}>{success}</div>}

      <h3>1. Restaurant</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {restaurants.map((r) => (
          <button key={r.id} onClick={() => pickRestaurant(r)}
            style={{ ...btnOutline, background: restaurant?.id === r.id ? '#1a1a2e' : '#fff', color: restaurant?.id === r.id ? '#fff' : '#1a1a2e' }}>
            {r.name}
          </button>
        ))}
      </div>

      {products.length > 0 && (
        <>
          <h3>2. Articles</h3>
          {(() => {
            const catMap = {};
            for (const p of products) {
              const key = p.category_name || 'Autres';
              if (!catMap[key]) catMap[key] = [];
              catMap[key].push(p);
            }
            return Object.entries(catMap).map(([cat, items]) => (
              <div key={cat}>
                <div style={{ fontWeight: '700', color: '#e94560', margin: '10px 0 6px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>{cat}</div>
                {items.map((p) => (
                  <div key={p.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
                    <div>
                      <span style={{ fontWeight: '600' }}>{p.name}</span>
                      <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{p.description}</span>
                      <span style={{ color: '#1a1a2e', fontWeight: '700', marginLeft: 8 }}>{p.price} DH</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button style={qtyBtn} onClick={() => dec(p.id)}>−</button>
                      <span style={{ fontWeight: '700', minWidth: 24, textAlign: 'center' }}>{cart[p.id] || 0}</span>
                      <button style={qtyBtn} onClick={() => inc(p.id)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}
          {subtotal > 0 && <p style={{ fontWeight: '700', textAlign: 'right' }}>Sous-total : {subtotal} DH</p>}
        </>
      )}

      <h3>3. Infos client</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input style={inp} placeholder="Nom du client" value={info.client_name} onChange={(e) => setInfo({ ...info, client_name: e.target.value })} />
        <input style={inp} placeholder="Téléphone" value={info.client_phone} onChange={(e) => setInfo({ ...info, client_phone: e.target.value })} />
      </div>
      <textarea style={{ ...inp, height: 70 }} placeholder="Adresse de livraison *" value={info.delivery_address} onChange={(e) => setInfo({ ...info, delivery_address: e.target.value })} />
      <input style={inp} placeholder="Étage / appartement / détails" value={info.delivery_details} onChange={(e) => setInfo({ ...info, delivery_details: e.target.value })} />
      <input style={inp} placeholder="Note pour le livreur (optionnel)" value={info.delivery_note} onChange={(e) => setInfo({ ...info, delivery_note: e.target.value })} />

      <h3>4. Prix livraison (optionnel — peut être fixé au dispatch)</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {DELIVERY_FEES.map((f) => (
          <button key={f} onClick={() => setFee(fee === f ? null : f)}
            style={{ ...btnOutline, background: fee === f ? '#1a1a2e' : '#fff', color: fee === f ? '#fff' : '#1a1a2e', padding: '7px 14px' }}>
            {f} DH
          </button>
        ))}
      </div>

      <button style={{ ...btn, width: '100%', padding: 15, fontSize: 16 }} onClick={submit}>
        Créer la commande →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// LIVREURS (manager + admin)
// ─────────────────────────────────────────────
function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [resetId, setResetId] = useState(null);
  const [newPwd, setNewPwd] = useState('');

  const load = useCallback(() => { api('/drivers').then((d) => setDrivers(d.drivers)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) { alert('Nom, email et mot de passe requis'); return; }
    try {
      await api('/drivers', { method: 'POST', body: form });
      setSuccess(`✅ Compte créé · Email : ${form.email} · MDP : ${form.password}`);
      setForm({ full_name: '', email: '', phone: '', password: '' });
      setShowForm(false); load();
    } catch (e) { alert(e.message); }
  }

  async function toggle(d) {
    try { await api(`/drivers/${d.id}`, { method: 'PATCH', body: { is_active: d.is_active ? 0 : 1 } }); load(); }
    catch (e) { alert(e.message); }
  }

  async function saveEdit(d) {
    try {
      await api(`/drivers/${d.id}`, { method: 'PATCH', body: { full_name: editForm.full_name, phone: editForm.phone } });
      setEditId(null); setSuccess('✅ Informations mises à jour'); load();
    } catch (e) { alert(e.message); }
  }

  async function resetPassword(d) {
    if (!newPwd.trim()) { alert('Entrez un nouveau mot de passe'); return; }
    try {
      await api('/admin/reset-password', { method: 'POST', body: { email: d.email, new_password: newPwd } });
      setSuccess(`✅ Mot de passe réinitialisé pour ${d.full_name}`);
      setResetId(null); setNewPwd('');
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>👤 Livreurs ({drivers.length})</h2>
        <button style={btn} onClick={() => setShowForm(!showForm)}>+ Ajouter un livreur</button>
      </div>

      {success && <div style={{ background: '#f0fff8', color: '#0a7', padding: 14, borderRadius: 12, marginBottom: 16 }}>{success}</div>}

      {showForm && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Nouveau livreur</h3>
          <form onSubmit={create}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input style={inp} placeholder="Nom complet *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <input style={inp} placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input style={inp} placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input style={inp} placeholder="Mot de passe *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn} type="submit">Créer</button>
              <button style={btnOutline} type="button" onClick={() => setShowForm(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {drivers.map((d) => (
        <div key={d.id} style={card}>
          {editId === d.id ? (
            <div>
              <h4 style={{ marginTop: 0 }}>Modifier {d.full_name}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={lbl}>Nom complet</label><input style={inp} value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
                <div><label style={lbl}>Téléphone</label><input style={inp} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn} onClick={() => saveEdit(d)}>💾 Sauvegarder</button>
                <button style={btnOutline} onClick={() => setEditId(null)}>Annuler</button>
              </div>
            </div>
          ) : resetId === d.id ? (
            <div>
              <h4 style={{ marginTop: 0 }}>🔑 Réinitialiser le mot de passe de {d.full_name}</h4>
              <input style={inp} type="password" placeholder="Nouveau mot de passe *" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn} onClick={() => resetPassword(d)}>Confirmer</button>
                <button style={btnOutline} onClick={() => { setResetId(null); setNewPwd(''); }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{d.full_name}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, color: d.is_active ? '#0a7' : '#e94560', fontWeight: '700' }}>
                  {d.is_active ? '● Actif' : '● Inactif'}
                </span>
                <div style={{ color: '#666', fontSize: 14 }}>{d.email} {d.phone ? `· ${d.phone}` : ''}</div>
                <div style={{ color: '#888', fontSize: 13 }}>{d.active_orders} livraison(s) en cours</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => { setEditId(d.id); setEditForm({ full_name: d.full_name, phone: d.phone || '' }); }}
                  style={{ ...btnOutline, padding: '7px 12px', fontSize: 13 }}>✏️ Modifier</button>
                <button onClick={() => { setResetId(d.id); setNewPwd(''); }}
                  style={{ ...btnOutline, padding: '7px 12px', fontSize: 13 }}>🔑 MDP</button>
                <button onClick={() => toggle(d)}
                  style={{ ...btnOutline, padding: '7px 12px', fontSize: 13, color: d.is_active ? '#e94560' : '#0a7', borderColor: d.is_active ? '#e94560' : '#0a7' }}>
                  {d.is_active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      {!drivers.length && <p style={{ color: '#888' }}>Aucun livreur. Ajoutez-en un ci-dessus.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// PARTENAIRES (admin seulement)
// ─────────────────────────────────────────────
function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [selected, setSelected] = useState(null); // partenaire en cours de gestion
  const [form, setForm] = useState({ restaurant_name: '', full_name: '', email: '', phone: '', password: '', restaurant_phone: '', restaurant_address: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => { api('/admin/partners').then((d) => setPartners(d.partners)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      await api('/admin/partners', { method: 'POST', body: form });
      setSuccess(`✅ Compte créé · Email : ${form.email} · MDP : ${form.password}`);
      setForm({ restaurant_name: '', full_name: '', email: '', phone: '', password: '', restaurant_phone: '', restaurant_address: '' });
      setShowForm(false); load();
    } catch (e) { setError(e.message); }
  }

  async function resetPassword(email) {
    const pwd = prompt(`Nouveau mot de passe pour ${email} :`);
    if (!pwd) return;
    try { await api('/admin/reset-password', { method: 'POST', body: { email, new_password: pwd } }); alert('✅ Mot de passe mis à jour'); }
    catch (e) { alert(e.message); }
  }

  // Si un partenaire est sélectionné → vue détaillée
  if (selected) return (
    <PartnerDetail
      partner={selected}
      onBack={() => { setSelected(null); load(); }}
      onResetPassword={resetPassword}
    />
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>🍽️ Restaurants partenaires ({partners.length})</h2>
        <button style={btn} onClick={() => setShowForm(!showForm)}>+ Nouveau partenaire</button>
      </div>

      {success && <div style={{ background: '#f0fff8', color: '#0a7', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 14 }}>{success}</div>}
      {error && <div style={{ background: '#fff0f0', color: '#e94560', padding: 14, borderRadius: 12, marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Nouveau partenaire</h3>
          <form onSubmit={create}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={lbl}>Nom du restaurant *</label><input style={inp} value={form.restaurant_name} onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} required /></div>
              <div><label style={lbl}>Nom du responsable</label><input style={inp} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><label style={lbl}>Email de connexion *</label><input style={inp} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div><label style={lbl}>Mot de passe *</label><input style={inp} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
              <div><label style={lbl}>Tél. restaurant</label><input style={inp} value={form.restaurant_phone} onChange={(e) => setForm({ ...form, restaurant_phone: e.target.value })} /></div>
              <div><label style={lbl}>Adresse</label><input style={inp} value={form.restaurant_address} onChange={(e) => setForm({ ...form, restaurant_address: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn} type="submit">Créer</button>
              <button style={btnOutline} type="button" onClick={() => setShowForm(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {partners.map((p) => (
        <div key={p.id} style={{ ...card, cursor: 'pointer' }} onClick={() => setSelected(p)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{p.restaurant_name || '—'}</strong>
              <span style={{ marginLeft: 8, fontSize: 12, color: p.restaurant_status === 'active' ? '#0a7' : '#e94560', fontWeight: '700' }}>
                {p.restaurant_status === 'active' ? '● Actif' : '● Inactif'}
              </span>
              <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>👤 {p.full_name} · 📧 {p.email}</div>
              {p.address && <div style={{ color: '#888', fontSize: 13 }}>📍 {p.address}</div>}
            </div>
            <span style={{ color: '#888', fontSize: 13 }}>Gérer →</span>
          </div>
        </div>
      ))}
      {!partners.length && <p style={{ color: '#888' }}>Aucun partenaire. Ajoutez-en un ci-dessus.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// DÉTAIL PARTENAIRE — infos + produits + CSV
// ─────────────────────────────────────────────
function PartnerDetail({ partner, onBack, onResetPassword }) {
  const [tab, setTab] = useState('info');
  const [resto, setResto] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const load = useCallback(async () => {
    if (!partner.restaurant_id) return;
    const d = await api(`/restaurants/${partner.restaurant_id}`);
    setResto(d.restaurant);
    setProducts(d.products);
    setCategories(d.categories);
  }, [partner.restaurant_id]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <button onClick={onBack} style={{ ...btnOutline, marginBottom: 16 }}>← Retour aux partenaires</button>
      <h2 style={{ margin: '0 0 4px' }}>{partner.restaurant_name}</h2>
      <p style={{ color: '#888', marginTop: 0 }}>📧 {partner.email}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['info', '⚙️ Infos'], ['categories', '🗂️ Catégories'], ['products', '🍕 Produits'], ['csv', '📄 Import CSV']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...btnOutline, background: tab === k ? '#1a1a2e' : '#fff', color: tab === k ? '#fff' : '#1a1a2e' }}>{l}</button>
        ))}
        <button style={{ ...btnOutline, borderColor: '#888', color: '#888' }} onClick={() => onResetPassword(partner.email)}>🔑 Réinitialiser MDP</button>
      </div>

      {tab === 'info'       && resto && <RestaurantInfoForm resto={resto} onSaved={load} />}
      {tab === 'categories' && <CategoriesManager restaurantId={partner.restaurant_id} categories={categories} onRefresh={load} />}
      {tab === 'products'   && <ProductsManager restaurantId={partner.restaurant_id} products={products} categories={categories} onRefresh={load} />}
      {tab === 'csv'        && <CsvImport restaurantId={partner.restaurant_id} onImported={load} />}
    </div>
  );
}

// ─── Gestion catégories ───
function CategoriesManager({ restaurantId, categories, onRefresh }) {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const DEFAULTS = ['Entrées', 'Plats principaux', 'Pizzas', 'Burgers', 'Sandwichs', 'Salades', 'Desserts', 'Boissons', 'Extras'];

  async function add(n) {
    const catName = n || name.trim();
    if (!catName) return;
    try {
      await api('/categories', { method: 'POST', body: { restaurant_id: restaurantId, name: catName, sort_order: categories.length } });
      setName(''); setMsg(`✅ Catégorie "${catName}" ajoutée`); onRefresh();
    } catch (e) { setMsg('❌ ' + e.message); }
  }

  async function remove(cat) {
    if (!confirm(`Supprimer la catégorie "${cat.name}" ? Les produits liés passeront dans "Autres".`)) return;
    try {
      await api(`/categories?id=${cat.id}`, { method: 'DELETE' });
      setMsg(`✅ Catégorie supprimée`); onRefresh();
    } catch (e) { setMsg('❌ ' + e.message); }
  }

  return (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>🗂️ Catégories ({categories.length})</h3>
      {msg && <div style={{ padding: 10, borderRadius: 8, background: msg.startsWith('✅') ? '#f0fff8' : '#fff0f0', color: msg.startsWith('✅') ? '#0a7' : '#e94560', marginBottom: 12 }}>{msg}</div>}

      <h4 style={{ marginBottom: 8 }}>Catégories actuelles</h4>
      {categories.length === 0 && <p style={{ color: '#888', fontSize: 14 }}>Aucune catégorie. Ajoutez-en ci-dessous.</p>}
      {categories.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontWeight: '600' }}>{c.name}</span>
          <button onClick={() => remove(c)} style={{ ...btnOutline, padding: '4px 10px', fontSize: 12, color: '#e94560', borderColor: '#e94560' }}>Supprimer</button>
        </div>
      ))}

      <h4 style={{ marginTop: 20, marginBottom: 8 }}>Ajouter une catégorie</h4>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input style={{ ...inp, margin: 0, flex: 1 }} placeholder="Nom de la catégorie" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button style={btn} onClick={() => add()}>Ajouter</button>
      </div>

      <div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Catégories courantes (cliquer pour ajouter) :</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DEFAULTS.filter((d) => !categories.find((c) => c.name === d)).map((d) => (
            <button key={d} onClick={() => add(d)} style={{ ...btnOutline, padding: '5px 12px', fontSize: 13 }}>{d}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Formulaire infos restaurant ───
function RestaurantInfoForm({ resto, onSaved }) {
  const [form, setForm] = useState({ name: resto.name, description: resto.description || '', phone: resto.phone || '', address: resto.address || '', logo_url: resto.logo_url || '', is_open: resto.is_open });
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setMsg('');
    try { await api(`/restaurants/${resto.id}`, { method: 'PATCH', body: form }); setMsg('✅ Informations mises à jour'); onSaved(); }
    catch (e) { setMsg('❌ ' + e.message); }
  }
  return (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>Informations du restaurant</h3>
      {msg && <div style={{ padding: 10, borderRadius: 8, background: msg.startsWith('✅') ? '#f0fff8' : '#fff0f0', color: msg.startsWith('✅') ? '#0a7' : '#e94560', marginBottom: 12 }}>{msg}</div>}
      <form onSubmit={save}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label style={lbl}>Nom *</label><input style={inp} value={form.name} onChange={set('name')} required /></div>
          <div><label style={lbl}>Téléphone</label><input style={inp} value={form.phone} onChange={set('phone')} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Description</label><textarea style={{ ...inp, height: 70 }} value={form.description} onChange={set('description')} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Adresse</label><input style={inp} value={form.address} onChange={set('address')} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>URL du logo</label><input style={inp} placeholder="https://..." value={form.logo_url} onChange={set('logo_url')} /></div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.is_open} onChange={(e) => setForm({ ...form, is_open: e.target.checked ? 1 : 0 })} />
          <span style={{ fontWeight: '600' }}>Restaurant ouvert</span>
        </label>
        <button style={btn} type="submit">Enregistrer</button>
      </form>
    </div>
  );
}

// ─── Gestion produits ───
function ProductsManager({ restaurantId, products, categories, onRefresh }) {
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm] = useState({ name: '', price: '', description: '', category_id: '' });
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState('');

  async function addProduct(e) {
    e.preventDefault(); setMsg('');
    try {
      await api('/products', { method: 'POST', body: { restaurant_id: restaurantId, name: newForm.name, price: parseFloat(newForm.price), description: newForm.description, category_id: newForm.category_id || null } });
      setNewForm({ name: '', price: '', description: '', category_id: '' });
      setShowNew(false); setMsg('✅ Produit ajouté'); onRefresh();
    } catch (e) { setMsg('❌ ' + e.message); }
  }

  async function saveEdit(id) {
    try { await api(`/products/${id}`, { method: 'PATCH', body: editForm }); setEditId(null); setMsg('✅ Produit mis à jour'); onRefresh(); }
    catch (e) { setMsg('❌ ' + e.message); }
  }

  async function deleteProduct(id, name) {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    try { await api(`/products/${id}`, { method: 'DELETE' }); setMsg('✅ Produit supprimé'); onRefresh(); }
    catch (e) { setMsg('❌ ' + e.message); }
  }

  async function toggleStock(p) {
    try { await api(`/products/${p.id}`, { method: 'PATCH', body: { in_stock: p.in_stock ? 0 : 1 } }); onRefresh(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Produits ({products.length})</h3>
        <button style={btn} onClick={() => setShowNew(!showNew)}>+ Ajouter</button>
      </div>
      {msg && <div style={{ padding: 10, borderRadius: 8, background: msg.startsWith('✅') ? '#f0fff8' : '#fff0f0', color: msg.startsWith('✅') ? '#0a7' : '#e94560', marginBottom: 12 }}>{msg}</div>}

      {showNew && (
        <div style={card}>
          <h4 style={{ marginTop: 0 }}>Nouveau produit</h4>
          {categories.length === 0 && (
            <div style={{ background: '#fff8e1', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#7a5f00' }}>
              ⚠️ Aucune catégorie créée. Allez d'abord dans l'onglet <strong>🗂️ Catégories</strong> pour en ajouter.
            </div>
          )}
          <form onSubmit={addProduct}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={lbl}>Nom *</label><input style={inp} value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} required /></div>
              <div><label style={lbl}>Prix (DH) *</label><input style={inp} type="number" step="0.5" value={newForm.price} onChange={(e) => setNewForm({ ...newForm, price: e.target.value })} required /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Description</label><input style={inp} value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} /></div>
              <div>
                <label style={lbl}>Catégorie *</label>
                <select style={{ ...inp, borderColor: !newForm.category_id ? '#ffc107' : '#ddd' }} value={newForm.category_id} onChange={(e) => setNewForm({ ...newForm, category_id: e.target.value })} required>
                  <option value="">— Choisir une catégorie —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn} type="submit">Ajouter</button>
              <button style={btnOutline} type="button" onClick={() => setShowNew(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {products.length === 0 && <p style={{ color: '#888' }}>Aucun produit. Ajoutez-en un ou importez un CSV.</p>}

      {(() => {
        const catMap = {};
        for (const p of products) {
          const cat = categories.find((c) => Number(c.id) === Number(p.category_id));
          const key = cat ? cat.id : 0;
          const label = cat ? cat.name : 'Sans catégorie';
          if (!catMap[key]) catMap[key] = { label, items: [] };
          catMap[key].items.push(p);
        }
        return Object.values(catMap).map((g) => (
          <div key={g.label}>
            <div style={{ fontWeight: '700', color: '#e94560', margin: '16px 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
              {g.label} ({g.items.length})
            </div>
            {g.items.map((p) => (
              <div key={p.id} style={{ ...card, marginBottom: 8 }}>
                {editId === p.id ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div><label style={lbl}>Nom</label><input style={inp} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                      <div><label style={lbl}>Prix (DH)</label><input style={inp} type="number" step="0.5" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} /></div>
                      <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Description</label><input style={inp} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                      <div>
                        <label style={lbl}>Catégorie</label>
                        <select style={inp} value={editForm.category_id || ''} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value || null })}>
                          <option value="">— Sans catégorie —</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={btn} onClick={() => saveEdit(p.id)}>💾 Sauvegarder</button>
                      <button style={btnOutline} onClick={() => setEditId(null)}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong>{p.name}</strong>
                      {!p.in_stock && <span style={{ marginLeft: 8, color: '#e94560', fontSize: 12, fontWeight: '700' }}>RUPTURE</span>}
                      <div style={{ color: '#666', fontSize: 14 }}>{p.description}</div>
                      <div style={{ fontWeight: '700', color: '#1a1a2e' }}>{p.price} DH</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button style={{ ...btnOutline, padding: '6px 12px', fontSize: 13 }} onClick={() => { setEditId(p.id); setEditForm({ name: p.name, price: p.price, description: p.description, category_id: p.category_id }); }}>✏️ Modifier</button>
                      <button style={{ ...btnOutline, padding: '6px 12px', fontSize: 13, color: p.in_stock ? '#e94560' : '#0a7', borderColor: p.in_stock ? '#e94560' : '#0a7' }} onClick={() => toggleStock(p)}>
                        {p.in_stock ? '⛔ Rupture' : '✅ Réactiver'}
                      </button>
                      <button style={{ ...btnOutline, padding: '6px 12px', fontSize: 13, color: '#e94560', borderColor: '#e94560' }} onClick={() => deleteProduct(p.id, p.name)}>🗑️ Suppr.</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ));
      })()}
    </div>
  );
}

// ─── Import CSV ───
function CsvImport({ restaurantId, onImported }) {
  const [csv, setCsv] = useState('name,description,price,category\nPizza Reine,Champignons jambon tomate,65,Pizzas\nCoca-Cola 33cl,Canette,10,Boissons');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(reader.result);
    reader.readAsText(f);
  }

  async function importNow() {
    setLoading(true); setResult(null);
    try { const r = await api('/products/import', { method: 'POST', body: { restaurant_id: restaurantId, csv } }); setResult(r); onImported(); }
    catch (e) { setResult({ error: e.message }); }
    finally { setLoading(false); }
  }

  return (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>📄 Import de produits par CSV</h3>
      <p style={{ color: '#666', fontSize: 14 }}>
        Colonnes requises : <code>name, description, price, category</code><br />
        La 1ère ligne = en-têtes. Les catégories manquantes sont créées automatiquement.
      </p>
      <input type="file" accept=".csv,.txt" onChange={onFile} style={{ marginBottom: 10 }} />
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={8}
        style={{ display: 'block', width: '100%', fontFamily: 'monospace', fontSize: 13, padding: 12, borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: 12 }}
      />
      <button style={btn} onClick={importNow} disabled={loading}>{loading ? 'Import en cours…' : 'Importer les produits'}</button>
      {result && !result.error && (
        <div style={{ marginTop: 12, color: '#0a7', background: '#f0fff8', padding: 12, borderRadius: 10 }}>
          ✅ {result.imported} produit(s) importé(s) avec succès.
          {result.errors?.length > 0 && <ul style={{ color: '#e94560', marginTop: 8 }}>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
      )}
      {result?.error && <div style={{ marginTop: 12, color: '#e94560' }}>❌ {result.error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// MES LIVRAISONS (driver)
// ─────────────────────────────────────────────
function DeliveriesPage() {
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
            <div style={{ color: '#e94560', margin: '4px 0', fontWeight: '600' }}>{STATUS_LABELS[o.status]}</div>
            <div style={{ color: '#666', fontSize: 14 }}>
              {goingToResto ? `🏪 Aller chez : ${o.restaurant_name}` : `📍 Livrer à : ${o.delivery_address}`}
            </div>
            {!goingToResto && <div style={{ color: '#888', fontSize: 13 }}>👤 {o.client_name} · {o.client_phone}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button style={{ ...btnOutline, flex: 1 }} onClick={() => navigate(o)}>🧭 Google Maps</button>
              {step && <button style={{ ...btn, flex: 2 }} onClick={() => advance(o)}>{step.label}</button>}
            </div>
          </div>
        );
      })}
      {!orders.length && <p style={{ color: '#888' }}>Aucune livraison assignée pour le moment.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────
function Centered({ children }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8' }}>{children}</div>;
}
const card = { background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid #eee' };
const inp = { display: 'block', width: '100%', padding: '11px 13px', margin: '4px 0 12px', borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 15 };
const lbl = { fontSize: 13, color: '#555', fontWeight: '600', display: 'block', marginBottom: 2 };
const btn = { background: '#1a1a2e', color: '#fff', border: 'none', padding: '11px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: '700', fontSize: 14 };
const btnOutline = { background: '#fff', color: '#1a1a2e', border: '1px solid #ddd', padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: '700', fontSize: 14 };
const navBtn = { color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: '600' };
const qtyBtn = { background: '#f0f0f0', border: 'none', width: 34, height: 34, borderRadius: 8, fontSize: 20, cursor: 'pointer', fontWeight: '700' };
