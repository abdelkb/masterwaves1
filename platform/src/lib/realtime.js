import Pusher from 'pusher';

// Temps réel : suivi GPS livreurs + notifications de commandes.
// Si Pusher n'est pas configuré, les appels deviennent des no-op (dev local).
let pusher = null;
if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY) {
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER || 'eu',
    useTLS: true,
  });
}

// Canaux :
//  - 'orders'            : flux global (gérant + restaurant)
//  - 'order-<id>'        : suivi d'une commande (client)
//  - 'driver-<id>'       : commandes assignées à un livreur
//  - 'drivers-location'  : positions GPS (gérant)
export async function emit(channel, event, data) {
  if (!pusher) return;
  try {
    await pusher.trigger(channel, event, data);
  } catch (e) {
    console.error('Pusher emit error:', e.message);
  }
}

export { pusher };
