import { NextResponse } from 'next/server';

export function ok(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Transitions de statut autorisées d'une commande.
export const ORDER_FLOW = {
  pending_restaurant: ['preparing', 'cancelled'],
  preparing: ['driver_assigned', 'cancelled'],
  driver_assigned: ['going_to_restaurant', 'cancelled'],
  going_to_restaurant: ['picked_up', 'cancelled'],
  picked_up: ['delivering', 'cancelled'],
  delivering: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// Statuts à partir desquels le client NE peut PLUS annuler seul
// (doit appeler le service / seul le gérant peut annuler).
export const CLIENT_LOCKED_STATUSES = [
  'preparing',
  'driver_assigned',
  'going_to_restaurant',
  'picked_up',
  'delivering',
  'delivered',
];

export const DELIVERY_FEE_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
