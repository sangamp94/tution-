import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const GET = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const requested = new URL(req.url).searchParams.get('studentId');
    const student = auth.role === 'STUDENT'
      ? await prisma.studentInfo.findUnique({ where: { user_id: auth.userId } })
      : requested ? await prisma.studentInfo.findUnique({ where: { id: requested } }) : null;
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    if (auth.role === 'TEACHER') {
      const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
      if (!tuition || tuition.id !== student.tuition_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const payments = await prisma.feePayment.findMany({ where: { student_id: student.id }, orderBy: [{ for_month: 'desc' }, { payment_date: 'desc' }] });
    const latest = payments[0] ?? null;
    return NextResponse.json({ student_id: student.id, latest, payments });
  } catch (err) { console.error('Fee status error:', err); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
});
