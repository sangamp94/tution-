import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
export const GET = withAuth(async (_req: NextRequest, _ctx, auth) => {
  try {
    const tuition = auth.role === 'TEACHER' ? await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } }) : (await prisma.studentInfo.findUnique({ where: { user_id: auth.userId } }))?.tuition;
    if (!tuition) return NextResponse.json({ classes: [] });
    const day = DAYS[new Date().getDay()];
    const classes = await prisma.class.findMany({ where: { tuition_id: tuition.id }, orderBy: { start_time: 'asc' } });
    return NextResponse.json({ date: new Date().toISOString().slice(0, 10), day, classes: classes.filter(c => !c.days_of_week || c.days_of_week.toUpperCase().includes(day)) });
  } catch (err) { console.error('Today classes error:', err); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
});
