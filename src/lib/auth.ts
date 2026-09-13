import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export type UserRole = 'TEACHER' | 'STUDENT';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable');
  }
  return secret;
}

export function signToken(payload: JwtPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '30d';
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
