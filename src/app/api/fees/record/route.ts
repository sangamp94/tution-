import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const POST = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const studentId = body?.student_id;
    const amount = Number(body?.amount);
    const forMonth = String(body?.for_month ?? '').trim();
    if (!studentId || !Number.isFinite(amount) || amount <= 0 || !forMonth) return NextResponse.json({ error: 'student_id, amount and for_month are required' }, { status: 400 });
    const student = await prisma.studentInfo.findUnique({ where: { id: studentId } });
    const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
    if (!student || !tuition || student.tuition_id !== tuition.id) return NextResponse.json({ error: 'Student not found or not yours' }, { status: 403 });
    const paymentDate = body?.payment_date ? new Date(body.payment_date) : new Date();
    const due = body?.next_due_date ? new Date(body.next_due_date) : null;
    if (Number.isNaN(paymentDate.getTime()) || (due && Number.isNaN(due.getTime()))) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    const payment = await prisma.feePayment.create({ data: { student_id: student.id, tuition_id: tuition.id, amount, payment_date: paymentDate, for_month: forMonth, next_due_date: due, status: body?.status === 'PENDING' ? 'PENDING' : 'PAID' } });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) { console.error('Fee record error:', err); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}, ['TEACHER']);
