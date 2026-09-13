import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const POST = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : subject;
    const days = Array.isArray(body?.days_of_week) ? body.days_of_week.join(',') : String(body?.days_of_week ?? '').trim();
    if (!subject || !days) return NextResponse.json({ error: 'subject and days_of_week are required' }, { status: 400 });
    const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
    if (!tuition) return NextResponse.json({ error: 'Set up tuition first' }, { status: 400 });
    const start = body?.start_time ? new Date(body.start_time) : null;
    const end = body?.end_time ? new Date(body.end_time) : null;
    if (start && Number.isNaN(start.getTime())) return NextResponse.json({ error: 'Invalid start_time' }, { status: 400 });
    if (end && Number.isNaN(end.getTime())) return NextResponse.json({ error: 'Invalid end_time' }, { status: 400 });
    const schedule = typeof body?.schedule === 'string' ? body.schedule : `${days}${start ? ` ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}${end ? ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`;
    const cls = await prisma.class.create({ data: { name, subject, schedule, teacher_id: auth.userId, tuition_id: tuition.id, tutor_name: body?.tutor_name ?? null, start_time: start, end_time: end, days_of_week: days } });
    return NextResponse.json({ class: cls }, { status: 201 });
  } catch (err) {
    console.error('Class create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);

export const GET = withAuth(async (_req: NextRequest, _ctx, auth) => {
  try {
    const tuition = auth.role === 'TEACHER' ? await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } }) : (await prisma.studentInfo.findUnique({ where: { user_id: auth.userId } }))?.tuition;
    if (!tuition) return NextResponse.json({ classes: [] });
    const classes = await prisma.class.findMany({ where: { tuition_id: tuition.id }, orderBy: { start_time: 'asc' } });
    return NextResponse.json({ classes });
  } catch (err) {
    console.error('Class list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
