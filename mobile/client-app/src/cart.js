import React, { createContext, useContext, useState } from 'react';

// Panier global (un seul restaurant à la fois, comme Glovo).
const CartCtx = createContext();

export function CartProvider({ children }) {
  const [restaurantId, setRestaurantId] = useState(null);
  const [items, setItems] = useState([]); // [{ product, quantity }]

  function add(product) {
    if (restaurantId && restaurantId !== product.restaurant_id) {
      // Changement de restaurant → on vide le panier.
      setItems([{ product, quantity: 1 }]);
      setRestaurantId(product.restaurant_id);
      return;
    }
    setRestaurantId(product.restaurant_id);
    setItems((prev) => {
      const ex = prev.find((i) => i.product.id === product.id);
      if (ex) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }
  function dec(productId) {
    setItems((prev) => prev
      .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
      .filter((i) => i.quantity > 0));
  }
  function clear() { setItems([]); setRestaurantId(null); }

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartCtx.Provider value={{ restaurantId, items, add, dec, clear, total, count }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
