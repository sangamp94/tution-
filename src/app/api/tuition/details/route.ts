import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const GET = withAuth(async (_req: NextRequest, _ctx, auth) => {
  try {
    let tuition;
    if (auth.role === 'TEACHER') {
      tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
    } else {
      const student = await prisma.studentInfo.findUnique({ where: { user_id: auth.userId }, include: { tuition: true } });
      tuition = student?.tuition ?? null;
    }
    if (!tuition) return NextResponse.json({ error: 'Tuition not found' }, { status: 404 });
    return NextResponse.json({ tuition });
  } catch (err) {
    console.error('Tuition details error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
