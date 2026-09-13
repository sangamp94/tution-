import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const GET = withAuth(async (_req: NextRequest, _ctx, auth) => {
  try {
    const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
    if (!tuition) return NextResponse.json({ requests: [] });

    const requests = await prisma.studentSignupRequest.findMany({
      where: { tuition_id: tuition.id, status: 'PENDING' },
      select: { id: true, name: true, phone: true, grade_class: true, created_at: true, status: true },
      orderBy: { created_at: 'asc' },
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error('Signup requests list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
