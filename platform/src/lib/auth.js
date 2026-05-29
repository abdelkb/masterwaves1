import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = '30d';

export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.full_name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Extrait l'utilisateur courant depuis l'en-tête Authorization: Bearer <token>
export async function getAuthUser(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await queryOne(
    'SELECT id, role, full_name, email, phone, is_active FROM users WHERE id = ?',
    [payload.id]
  );
  if (!user || !user.is_active) return null;
  return user;
}

// Garde de rôle : renvoie { user } ou { error, status }
export async function requireRole(req, roles) {
  const user = await getAuthUser(req);
  if (!user) return { error: 'Non authentifié', status: 401 };
  if (roles && !roles.includes(user.role))
    return { error: 'Accès refusé', status: 403 };
  return { user };
}
