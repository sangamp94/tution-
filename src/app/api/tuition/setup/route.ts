import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const POST = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const defaultFee = Number(body?.default_fee);
    if (!name || !Number.isFinite(defaultFee) || defaultFee < 0) {
      return NextResponse.json({ error: 'name and valid default_fee are required' }, { status: 400 });
    }
    const tuition = await prisma.tuition.upsert({
      where: { tutor_id: auth.userId },
      update: { name, default_fee: defaultFee },
      create: { tutor_id: auth.userId, name, default_fee: defaultFee },
    });
    return NextResponse.json({ tuition });
  } catch (err) {
    console.error('Tuition setup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
