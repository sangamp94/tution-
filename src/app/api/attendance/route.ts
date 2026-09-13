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
      result.push(await prisma.attendance.upsert({ where: { class_id_student_id_date: { class_id: classId, student_id: student.id, date: day } }, update: { status }, create: { class_id: classId, student_id: student.id, date: day, status } }));
    }
    return NextResponse.json({ attendance: result });
  } catch (err) { console.error('Attendance save error:', err); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}, ['TEACHER']);

export const GET = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const studentId = new URL(req.url).searchParams.get('studentId');
    if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    const student = await prisma.studentInfo.findUnique({ where: { id: studentId }, include: { tuition: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    if (auth.role === 'STUDENT' && student.user_id !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (auth.role === 'TEACHER') {
      const own = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
      if (!own || own.id !== student.tuition_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const attendance = await prisma.attendance.findMany({ where: { student_id: student.id }, include: { class: true }, orderBy: { date: 'desc' } });
    return NextResponse.json({ attendance });
  } catch (err) { console.error('Attendance history error:', err); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
});
