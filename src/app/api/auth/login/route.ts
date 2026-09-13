import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { phone, password } = body ?? {};

    if (!phone || !password) {
      return NextResponse.json({ error: 'phone and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 });
    }

    const token = signToken({ userId: user.id, role: user.role });

    return NextResponse.json({
      token,
      role: user.role,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    });
  } catch (err: unknown) {
    console.error('Login error:', err);

    const message = err instanceof Error ? err.message : 'Unknown server error';
    const code = typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';

    return NextResponse.json(
      {
        error: 'Login failed',
        code: code || undefined,
        detail: message,
      },
      { status: 500 }
    );
  }
}
