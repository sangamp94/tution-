import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const POST = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const classId = body?.class_id;
    const records = Array.isArray(body?.attendance) ? body.attendance : [];
    if (!classId || !records.length) return NextResponse.json({ error: 'class_id and attendance array are required' }, { status: 400 });
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.teacher_id !== auth.userId) return NextResponse.json({ error: 'Invalid class_id' }, { status: 403 });
    const date = body?.date ? new Date(body.date) : new Date();
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    const day = new Date(date); day.setHours(0, 0, 0, 0);
    const result = [];
    for (const r of records) {
      if (!r?.student_id || !['PRESENT','ABSENT','present','absent'].includes(r.status)) continue;
      const student = await prisma.studentInfo.findUnique({ where: { id: r.student_id } });
      if (!student || student.tuition_id !== cls.tuition_id) continue;
      const status = String(r.status).toUpperCase() as 'PRESENT' | 'ABSENT';
      result.push(await prisma.attendance.upsert({
        where: { class_id_student_id_date: { class_id: classId, student_id: student.id, date: day } },
        update: { status },
        create: { class_id: classId, student_id: student.id, date: day, status },
      }));
    }
    return NextResponse.json({ attendance: result });
  } catch (err) {
    console.error('Attendance save error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);

export const GET = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const params = new URL(req.url).searchParams;
    const studentId = params.get('studentId');
    const classId = params.get('classId');
    const dateParam = params.get('date');

    if (studentId) {
      const student = await prisma.studentInfo.findUnique({ where: { id: studentId }, include: { tuition: true } });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      if (auth.role === 'STUDENT' && student.user_id !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (auth.role === 'TEACHER') {
        const own = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
        if (!own || own.id !== student.tuition_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const attendance = await prisma.attendance.findMany({ where: { student_id: student.id }, include: { class: true }, orderBy: { date: 'desc' } });
      return NextResponse.json({ attendance });
    }

    if (!classId) return NextResponse.json({ error: 'studentId or classId is required' }, { status: 400 });
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, tuition_id: true, teacher_id: true } });
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    if (auth.role === 'TEACHER') {
      if (cls.teacher_id !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      const student = await prisma.studentInfo.findUnique({ where: { user_id: auth.userId }, select: { tuition_id: true } });
      if (!student || student.tuition_id !== cls.tuition_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let dateFilter = {};
    if (dateParam) {
      const date = new Date(dateParam);
      if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      dateFilter = { gte: start, lt: end };
    }

    const attendance = await prisma.attendance.findMany({
      where: { class_id: classId, ...(dateParam ? { date: dateFilter } : {}) },
      include: { student: { include: { user: { select: { id: true, name: true, phone: true } } } } },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ attendance });
  } catch (err) {
    console.error('Attendance history error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
