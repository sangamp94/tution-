import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JwtPayload, UserRole } from '@/lib/auth';

// NOTE ON APPROACH:
// Next.js root-level `middleware.ts` runs on the Edge Runtime by default,
// which does not support `jsonwebtoken` (it needs Node's crypto module)
// or Prisma. So instead of a root middleware.ts, auth is implemented as a
// higher-order function that wraps each Node.js-runtime route handler.
// This runs per-route rather than globally, but keeps full Node API access.

type RouteContext = { params: Record<string, string | string[]> };

export type AuthedHandler = (
  req: NextRequest,
  context: RouteContext,
  auth: JwtPayload
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: AuthedHandler, allowedRoles?: UserRole[]) {
  return async (req: NextRequest, context: RouteContext) => {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.slice('Bearer '.length).trim();

    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    return handler(req, context, payload);
  };
}
