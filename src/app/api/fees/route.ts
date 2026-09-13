import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const GET = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const params = new URL(req.url).searchParams;
    const studentId = params.get('studentId');
    const month = params.get('for_month');

    if (auth.role === 'STUDENT') {
      const student = await prisma.studentInfo.findUnique({ where: { user_id: auth.userId }, select: { id: true, tuition_id: true } });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      const payments = await prisma.feePayment.findMany({
        where: { student_id: student.id, ...(month ? { for_month: month } : {}) },
        orderBy: [{ for_month: 'desc' }, { payment_date: 'desc' }],
      });
      return NextResponse.json({ payments });
    }

    const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId }, select: { id: true } });
    if (!tuition) return NextResponse.json({ payments: [] });

    if (studentId) {
      const student = await prisma.studentInfo.findFirst({ where: { id: studentId, tuition_id: tuition.id }, select: { id: true } });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const payments = await prisma.feePayment.findMany({
      where: { tuition_id: tuition.id, ...(studentId ? { student_id: studentId } : {}), ...(month ? { for_month: month } : {}) },
      include: { student: { include: { user: { select: { id: true, name: true, phone: true } } } } },
      orderBy: [{ for_month: 'desc' }, { payment_date: 'desc' }],
    });
    return NextResponse.json({ payments });
  } catch (err) {
    console.error('Fee list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
