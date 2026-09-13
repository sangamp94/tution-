import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const GET = withAuth(async (_req: NextRequest, _ctx, auth) => {
  try {
    let tuitionId: string | null = null;

    if (auth.role === 'TEACHER') {
      const tuition = await prisma.tuition.findUnique({
        where: { tutor_id: auth.userId },
        select: { id: true },
      });
      tuitionId = tuition?.id ?? null;
    } else {
      const student = await prisma.studentInfo.findUnique({
        where: { user_id: auth.userId },
        select: { tuition_id: true },
      });
      tuitionId = student?.tuition_id ?? null;
    }

    if (!tuitionId) return NextResponse.json({ classes: [] });

    const now = new Date();
    const day = DAYS[now.getDay()];
    const classes = await prisma.class.findMany({
      where: { tuition_id: tuitionId },
      orderBy: { start_time: 'asc' },
    });

    return NextResponse.json({
      date: now.toISOString().slice(0, 10),
      day,
      classes: classes.filter(
        (c) => !c.days_of_week || c.days_of_week.toUpperCase().includes(day)
      ),
    });
  } catch (err) {
    console.error('Today classes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
