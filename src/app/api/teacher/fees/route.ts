import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';
import { serializeTransaction } from '@/lib/serialize';

export const POST = withAuth(async (req, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const { student_id, amount, month, status, payment_method } = body ?? {};

    if (!student_id || amount === undefined || !month) {
      return NextResponse.json(
        { error: 'student_id, amount and month are required' },
        { status: 400 }
      );
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: student_id },
      include: { class: true },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // A student only has a `class` if class_id was set. If your app lets
    // teachers record fees for students with no class assigned yet, relax
    // or replace this check with an explicit teacher<->student link.
    if (!studentProfile.class || studentProfile.class.teacher_id !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden: not your student' }, { status: 403 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        student_id,
        amount,
        month,
        status: status === 'PENDING' ? 'PENDING' : 'PAID',
        payment_method,
      },
    });

    return NextResponse.json({ transaction: serializeTransaction(transaction) }, { status: 201 });
  } catch (err) {
    console.error('Record fee error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
