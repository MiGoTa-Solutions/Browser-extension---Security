import jwt, { JwtPayload } from 'jsonwebtoken';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function signToken(userId: number) {
  return jwt.sign({ userId }, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: number; iat: number; exp: number } {
  const payload = jwt.verify(token, getSecret());

  if (typeof payload === 'string') {
    throw new Error('Invalid token payload');
  }

  const typedPayload = payload as JwtPayload & { userId?: number };

  if (typeof typedPayload.userId !== 'number') {
    throw new Error('Invalid token payload');
  }

  return {
    userId: typedPayload.userId,
    iat: typedPayload.iat ?? 0,
    exp: typedPayload.exp ?? 0,
  };
}
