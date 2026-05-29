'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, saveSession, getUser, logout } from '@/lib/apiClient';

const STATUS_LABELS = {
  pending_restaurant: '🔔 En attente de validation',
  preparing: '👨‍🍳 En préparation',
  driver_assigned: '🛵 Livreur assigné',
  going_to_restaurant: '🛵 Livreur en route vers le restaurant',
  picked_up: '📦 Commande récupérée',
  delivering: '🚗 En cours de livraison',
  delivered: '✅ Livrée',
  cancelled: '❌ Annulée',
};

const STATUS_STEPS = ['preparing', 'driver_assigned', 'going_to_restaurant', 'picked_up', 'delivering', 'delivered'];

export default function ClientApp() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('restaurants');
  const [cart, setCart] = useState({ restaurantId: null, items: [] });

  useEffect(() => { setUser(getUser()); }, []);

  if (!user) return <AuthPage onAuth={setUser} />;
  if (user.role !== 'client') return (
    <Centered>
      <p>Cette interface est réservée aux clients.</p>
      <button style={btn} onClick={() => { logout(); setUser(null); }}>Déconnexion</button>
    </Centered>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', minHeight: '100vh', background: '#f5f6f8' }}>
      <nav style={{ background: '#1a1a2e', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>🌊 Master Waves</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[['restaurants', '🍽️ Restaurants'], ['orders', '📦 Commandes']].map(([k, l]) => (
            <button key={k} onClick={() => setPage(k)} style={{ ...navBtn, background: page === k ? '#e94560' : 'transparent' }}>{l}</button>
          ))}
          {cart.items.length > 0 && (
            <button onClick={() => setPage('cart')} style={{ ...navBtn, background: page === 'cart' ? '#e94560' : '#333' }}>
              🛒 {cart.items.reduce((s, i) => s + i.quantity, 0)}
            </button>
          )}
          <button onClick={() => { logout(); setUser(null); }} style={{ ...navBtn, background: 'transparent', color: '#aaa' }}>Quitter</button>
        </div>
      </nav>
      <div style={{ padding: 16 }}>
        {page === 'restaurants' && <RestaurantsPage onSelectRestaurant={(r) => setPage('menu_' + r.id)} setPage={setPage} restaurant={null} />}
        {page.startsWith('menu_') && <MenuPage restaurantId={page.split('_')[1]} cart={cart} setCart={setCart} onCartClick={() => setPage('cart')} />}
        {page === 'cart' && <CartPage cart={cart} setCart={setCart} user={user} onOrdered={(id) => setPage('track_' + id)} />}
        {page === 'orders' && <OrdersPage onTrack={(id) => setPage('track_' + id)} />}
        {page.startsWith('track_') && <TrackPage orderId={page.split('_')[1]} onBack={() => setPage('orders')} />}
      </div>
    </div>
  );
}

// ---------- AUTH ----------
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setError('');
    try {
      const { token, user } = await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: form });
      saveSession(token, user); onAuth(user);
    } catch (e) { setError(e.message); }
  }
  return (
    <Centered>
      <div style={{ width: 360, background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,.1)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 28 }}>🌊 Master Waves</h1>
        <p style={{ color: '#888', marginTop: 0, marginBottom: 24 }}>Livraison à domicile</p>
        {mode === 'register' && <>
          <input style={inp} placeholder="Nom complet" value={form.full_name} onChange={set('full_name')} />
          <input style={inp} placeholder="Téléphone" value={form.phone} onChange={set('phone')} />
        </>}
        <input style={inp} placeholder="Email" type="email" value={form.email} onChange={set('email')} />
        <input style={inp} placeholder="Mot de passe" type="password" value={form.password} onChange={set('password')} />
        {error && <p style={{ color: '#e94560', fontSize: 14 }}>{error}</p>}
        <button style={{ ...btn, width: '100%' }} onClick={submit}>{mode === 'login' ? 'Se connecter' : "S'inscrire"}</button>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>
          {mode === 'login' ? 'Pas de compte ?' : 'Déjà inscrit ?'}
          <a href="#" style={{ color: '#e94560', marginLeft: 6 }} onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); }}>
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </a>
        </p>
      </div>
    </Centered>
  );
}

// ---------- RESTAURANTS ----------
function RestaurantsPage({ onSelectRestaurant }) {
  const [list, setList] = useState([]);
  useEffect(() => { api('/restaurants').then((d) => setList(d.restaurants)).catch(() => {}); }, []);
  return (
    <div>
      <h2 style={{ margin: '0 0 16px' }}>Restaurants disponibles</h2>
      {list.map((r) => (
        <div key={r.id} onClick={() => onSelectRestaurant(r)} style={{ ...card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: 17 }}>{r.name}</div>
            <div style={{ color: '#666', fontSize: 14 }}>{r.description}</div>
            <div style={{ color: '#888', fontSize: 13 }}>📍 {r.address}</div>
          </div>
          <span style={{ color: r.is_open ? '#0a9d6e' : '#e94560', fontWeight: '700' }}>{r.is_open ? 'Ouvert' : 'Fermé'}</span>
        </div>
      ))}
      {!list.length && <p style={{ color: '#888' }}>Aucun restaurant disponible.</p>}
    </div>
  );
}

// ---------- MENU ----------
function MenuPage({ restaurantId, cart, setCart, onCartClick }) {
  const [data, setData] = useState(null);
  useEffect(() => { api(`/restaurants/${restaurantId}`).then(setData).catch(() => {}); }, [restaurantId]);
  if (!data) return <p>Chargement…</p>;

  function addToCart(product) {
    if (cart.restaurantId && cart.restaurantId !== product.restaurant_id) {
      if (!confirm('Votre panier contient des articles d\'un autre restaurant. Vider le panier ?')) return;
      setCart({ restaurantId: product.restaurant_id, items: [{ product, quantity: 1 }] });
      return;
    }
    setCart((c) => {
      const ex = c.items.find((i) => i.product.id === product.id);
      return {
        restaurantId: product.restaurant_id,
        items: ex ? c.items.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
          : [...c.items, { product, quantity: 1 }]
      };
    });
  }
  function dec(productId) {
    setCart((c) => ({ ...c, items: c.items.map((i) => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i).filter((i) => i.quantity > 0) }));
  }

  const total = cart.items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <div>
      <h2 style={{ margin: '0 0 4px' }}>{data.restaurant.name}</h2>
      <p style={{ color: '#666', marginTop: 0 }}>{data.restaurant.description}</p>
      {data.products.map((p) => {
        const inCart = cart.items.find((i) => i.product.id === p.id);
        return (
          <div key={p.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700' }}>{p.name}</div>
              <div style={{ color: '#666', fontSize: 14 }}>{p.description}</div>
              <div style={{ fontWeight: '700', color: '#1a1a2e', marginTop: 4 }}>{p.price} DH</div>
            </div>
            {p.in_stock ? (
              inCart ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button style={qtyBtn} onClick={() => dec(p.id)}>−</button>
                  <span style={{ fontWeight: '700', fontSize: 18 }}>{inCart.quantity}</span>
                  <button style={qtyBtn} onClick={() => addToCart(p)}>+</button>
                </div>
              ) : <button style={btn} onClick={() => addToCart(p)}>+ Ajouter</button>
            ) : <span style={{ color: '#e94560', fontSize: 13 }}>Rupture</span>}
          </div>
        );
      })}
      {cart.items.length > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 760 }}>
          <button onClick={onCartClick} style={{ ...btn, width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: 16, padding: '16px 20px', background: '#e94560' }}>
            <span>🛒 {cart.items.reduce((s, i) => s + i.quantity, 0)} article(s)</span>
            <span>Commander · {total} DH</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- PANIER + ADRESSE ----------
function CartPage({ cart, setCart, user, onOrdered }) {
  const [step, setStep] = useState('cart'); // cart | address | confirm
  const [addr, setAddr] = useState({ formatted: '', details: '', note: '', label: 'Maison' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [payment, setPayment] = useState('cash');
  const [loading, setLoading] = useState(false);
  const total = cart.items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  useEffect(() => { api('/addresses').then((d) => setSavedAddresses(d.addresses)).catch(() => {}); }, []);

  async function useGps() {
    if (!navigator.geolocation) { alert('Géolocalisation non disponible'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
        const data = await res.json();
        const formatted = data.results?.[0]?.formatted_address || `${lat}, ${lng}`;
        setAddr((a) => ({ ...a, formatted, lat, lng }));
      } catch { setAddr((a) => ({ ...a, lat, lng })); }
      setStep('address');
    }, () => alert('Impossible d\'obtenir la position'));
  }

  async function placeOrder() {
    setLoading(true);
    try {
      const { id } = await api('/orders', { method: 'POST', body: {
        restaurant_id: cart.restaurantId,
        items: cart.items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        delivery_address: addr.formatted, delivery_details: addr.details,
        delivery_note: addr.note, delivery_lat: addr.lat, delivery_lng: addr.lng,
        payment_method: payment,
      } });
      // Sauvegarder l'adresse
      try { await api('/addresses', { method: 'POST', body: { ...addr, is_default: savedAddresses.length === 0 } }); } catch {}
      setCart({ restaurantId: null, items: [] });
      onOrdered(id);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  if (step === 'cart') return (
    <div>
      <h2>🛒 Mon panier</h2>
      {cart.items.map((i) => (
        <div key={i.product.id} style={{ ...card, display: 'flex', justifyContent: 'space-between' }}>
          <span>{i.quantity}× {i.product.name}</span>
          <span style={{ fontWeight: '700' }}>{i.product.price * i.quantity} DH</span>
        </div>
      ))}
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: 18 }}>
        <span>Sous-total</span><span>{total} DH</span>
      </div>
      <p style={{ color: '#888', fontSize: 13 }}>Les frais de livraison seront ajoutés par le gérant.</p>

      {savedAddresses.length > 0 && (
        <div>
          <h3>Adresses sauvegardées</h3>
          {savedAddresses.map((a) => (
            <div key={a.id} onClick={() => { setAddr(a); setStep('address'); }} style={{ ...card, cursor: 'pointer' }}>
              <strong>{a.label} {a.is_default ? '⭐' : ''}</strong>
              <div style={{ color: '#666', fontSize: 14 }}>{a.formatted}</div>
            </div>
          ))}
        </div>
      )}
      <h3>Nouvelle adresse</h3>
      <button style={{ ...btn, width: '100%', marginBottom: 8 }} onClick={useGps}>📍 Utiliser ma position actuelle</button>
      <button style={{ ...btnOutline, width: '100%' }} onClick={() => setStep('address')}>✍️ Saisir manuellement</button>
    </div>
  );

  if (step === 'address') return (
    <div>
      <h2>📍 Confirmer l'adresse</h2>
      <p style={{ color: '#666', fontSize: 14 }}>Vérifiez et complétez votre adresse pour éviter toute erreur.</p>
      <label style={lbl}>Adresse *</label>
      <textarea style={{ ...inp, height: 80, resize: 'none' }} placeholder="Rue, numéro, quartier, ville" value={addr.formatted} onChange={(e) => setAddr({ ...addr, formatted: e.target.value })} />
      <label style={lbl}>Étage / Appartement</label>
      <input style={inp} placeholder="Ex: 3ème étage, appt 7" value={addr.details} onChange={(e) => setAddr({ ...addr, details: e.target.value })} />
      <label style={lbl}>Indication pour le livreur</label>
      <input style={inp} placeholder="Ex: Bâtiment rouge, sonner 3 fois" value={addr.note} onChange={(e) => setAddr({ ...addr, note: e.target.value })} />
      <label style={lbl}>Libellé</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['Maison', 'Bureau', 'Autre'].map((l) => (
          <button key={l} onClick={() => setAddr({ ...addr, label: l })} style={{ ...btnOutline, flex: 1, background: addr.label === l ? '#1a1a2e' : '#fff', color: addr.label === l ? '#fff' : '#1a1a2e' }}>{l}</button>
        ))}
      </div>
      <button style={{ ...btn, width: '100%' }} onClick={() => { if (!addr.formatted) { alert('Adresse requise'); return; } setStep('confirm'); }}>Continuer vers le paiement →</button>
    </div>
  );

  if (step === 'confirm') return (
    <div>
      <h2>💳 Paiement</h2>
      <div style={card}><strong>📍 {addr.label}</strong><div style={{ color: '#666' }}>{addr.formatted}</div>{addr.details && <div style={{ color: '#888', fontSize: 13 }}>{addr.details}</div>}</div>
      <h3>Mode de paiement</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['cash', '💵 Espèces à la livraison'], ['cmi', '💳 Carte (CMI)']].map(([k, l]) => (
          <button key={k} onClick={() => setPayment(k)} style={{ ...btnOutline, flex: 1, background: payment === k ? '#1a1a2e' : '#fff', color: payment === k ? '#fff' : '#1a1a2e' }}>{l}</button>
        ))}
      </div>
      <div style={{ ...card, fontWeight: '700', display: 'flex', justifyContent: 'space-between', fontSize: 18 }}>
        <span>Total articles</span><span>{total} DH</span>
      </div>
      <p style={{ color: '#888', fontSize: 13 }}>+ frais de livraison fixés par le gérant</p>
      <button style={{ ...btn, width: '100%', background: '#e94560', padding: 16, fontSize: 17 }} onClick={placeOrder} disabled={loading}>
        {loading ? 'Envoi en cours…' : '✅ Confirmer la commande'}
      </button>
    </div>
  );
}

// ---------- MES COMMANDES ----------
function OrdersPage({ onTrack }) {
  const [orders, setOrders] = useState([]);
  const load = useCallback(() => { api('/orders').then((d) => setOrders(d.orders)).catch(() => {}); }, []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  return (
    <div>
      <h2>📦 Mes commandes</h2>
      {orders.map((o) => (
        <div key={o.id} onClick={() => onTrack(o.id)} style={{ ...card, cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>#{o.id} · {o.restaurant_name}</strong>
            <span>{o.total} DH</span>
          </div>
          <div style={{ color: '#e94560', marginTop: 4 }}>{STATUS_LABELS[o.status]}</div>
          <div style={{ color: '#888', fontSize: 13 }}>{o.delivery_address}</div>
        </div>
      ))}
      {!orders.length && <p style={{ color: '#888' }}>Aucune commande pour le moment.</p>}
    </div>
  );
}

// ---------- SUIVI COMMANDE ----------
function TrackPage({ orderId, onBack }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => { api(`/orders/${orderId}`).then(setData).catch(() => {}); }, [orderId]);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  async function cancel() {
    try { await api(`/orders/${orderId}/cancel`, { method: 'POST', body: {} }); load(); }
    catch (e) { alert(e.message); }
  }

  if (!data) return <p>Chargement…</p>;
  const { order, items } = data;
  const stepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div>
      <button onClick={onBack} style={{ ...btnOutline, marginBottom: 16 }}>← Retour</button>
      <h2>Commande #{order.id}</h2>
      <div style={{ ...card, background: '#1a1a2e', color: '#fff' }}>
        <div style={{ fontSize: 20, fontWeight: '700' }}>{STATUS_LABELS[order.status]}</div>
      </div>

      {order.status !== 'cancelled' && order.status !== 'pending_restaurant' && (
        <div style={card}>
          {STATUS_STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, opacity: i <= stepIndex ? 1 : 0.3 }}>
              <span style={{ fontSize: 18 }}>{i <= stepIndex ? '✅' : '⬜'}</span>
              <span>{STATUS_LABELS[s]}</span>
            </div>
          ))}
        </div>
      )}

      {order.driver_name && (
        <div style={card}>
          <strong>🛵 Votre livreur</strong>
          <div>{order.driver_name} · {order.driver_phone || ''}</div>
        </div>
      )}

      <div style={card}>
        <strong>Détail</strong>
        {items.map((it) => <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span>{it.quantity}× {it.name}</span><span>{it.unit_price * it.quantity} DH</span></div>)}
        <div style={{ borderTop: '1px solid #eee', marginTop: 10, paddingTop: 10, fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
          <span>Total</span><span>{order.total} DH</span>
        </div>
      </div>

      {order.status === 'pending_restaurant' && (
        <button onClick={cancel} style={{ ...btn, background: '#e94560', width: '100%' }}>Annuler la commande</button>
      )}
      {['preparing', 'driver_assigned', 'going_to_restaurant', 'picked_up', 'delivering'].includes(order.status) && (
        <p style={{ color: '#888', textAlign: 'center', fontSize: 14 }}>
          Commande en cours — pour annuler, appelez le service. ☎️
        </p>
      )}
    </div>
  );
}

// ---------- UI ----------
function Centered({ children }) { return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8' }}>{children}</div>; }
const card = { background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid #eee' };
const inp = { display: 'block', width: '100%', padding: '11px 13px', margin: '4px 0 12px', borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box', fontSize: 15 };
const lbl = { fontSize: 13, color: '#555', fontWeight: '600' };
const btn = { background: '#1a1a2e', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: '700', fontSize: 15 };
const btnOutline = { background: '#fff', color: '#1a1a2e', border: '1px solid #ddd', padding: '11px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: '700', fontSize: 15 };
const navBtn = { color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14 };
const qtyBtn = { background: '#f0f0f0', border: 'none', width: 36, height: 36, borderRadius: 8, fontSize: 22, cursor: 'pointer', fontWeight: '700' };
