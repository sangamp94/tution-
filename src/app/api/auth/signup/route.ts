import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, UserRole } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const role = body?.role === 'STUDENT' ? 'STUDENT' : body?.role === 'TEACHER' ? 'TEACHER' : '';

    if (!name || !phone || !password || !role) {
      return NextResponse.json(
        { error: 'name, phone, password and role are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        password_hash,
        role: role as UserRole,
      },
    });

    const token = signToken({ userId: user.id, role: user.role as UserRole });

    return NextResponse.json(
      {
        token,
        role: user.role,
        user: { id: user.id, name: user.name, phone: user.phone },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
