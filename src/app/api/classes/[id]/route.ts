import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

type RouteContext = { params: Record<string, string | string[]> };

function getId(ctx: RouteContext) {
  const raw = ctx?.params?.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

export const PATCH = withAuth(async (req: NextRequest, ctx, auth) => {
  try {
    const id = getId(ctx);
    if (!id) return NextResponse.json({ error: 'Class id is required' }, { status: 400 });

    const existing = await prisma.class.findFirst({
      where: { id, teacher_id: auth.userId },
      select: { id: true, tuition_id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const body = await req.json().catch(() => null);
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : undefined;
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const days = Array.isArray(body?.days_of_week)
      ? body.days_of_week.join(',')
      : typeof body?.days_of_week === 'string'
        ? body.days_of_week.trim()
        : undefined;

    const start = body?.start_time !== undefined && body?.start_time !== null && body?.start_time !== ''
      ? new Date(body.start_time)
      : body?.start_time === null ? null : undefined;
    const end = body?.end_time !== undefined && body?.end_time !== null && body?.end_time !== ''
      ? new Date(body.end_time)
      : body?.end_time === null ? null : undefined;

    if (start && Number.isNaN(start.getTime())) return NextResponse.json({ error: 'Invalid start_time' }, { status: 400 });
    if (end && Number.isNaN(end.getTime())) return NextResponse.json({ error: 'Invalid end_time' }, { status: 400 });

    const nextSubject = subject ?? undefined;
    const nextName = name ?? undefined;
    const nextDays = days ?? undefined;
    const schedule = typeof body?.schedule === 'string'
      ? body.schedule.trim()
      : nextDays !== undefined || start !== undefined || end !== undefined
        ? `${nextDays ?? ''}${start ? ` ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}${end ? ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`.trim()
        : undefined;

    const cls = await prisma.class.update({
      where: { id },
      data: {
        ...(nextSubject !== undefined ? { subject: nextSubject } : {}),
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextDays !== undefined ? { days_of_week: nextDays } : {}),
        ...(start !== undefined ? { start_time: start } : {}),
        ...(end !== undefined ? { end_time: end } : {}),
        ...(schedule !== undefined ? { schedule } : {}),
        ...(body?.tutor_name !== undefined ? { tutor_name: body.tutor_name || null } : {}),
      },
    });

    return NextResponse.json({ class: cls });
  } catch (err) {
    console.error('Class update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);

export const DELETE = withAuth(async (_req: NextRequest, ctx, auth) => {
  try {
    const id = getId(ctx);
    if (!id) return NextResponse.json({ error: 'Class id is required' }, { status: 400 });

    const existing = await prisma.class.findFirst({
      where: { id, teacher_id: auth.userId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Class deleted successfully' });
  } catch (err) {
    console.error('Class delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
