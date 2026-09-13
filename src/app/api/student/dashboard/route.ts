import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';
import { serializeTransaction } from '@/lib/serialize';

export const GET = withAuth(async (_req, _ctx, auth) => {
  try {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { user_id: auth.userId },
      include: {
        class: true,
        transactions: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const pendingTransactions = studentProfile.transactions.filter((t) => t.status === 'PENDING');
    const totalDue = pendingTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    const notices = await prisma.notice.findMany({
      where: { OR: [{ target_role: 'ALL' }, { target_role: 'STUDENT' }] },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      monthlyFee: Number(studentProfile.monthly_fee),
      totalDue,
      pendingTransactions: pendingTransactions.map(serializeTransaction),
      transactionHistory: studentProfile.transactions.map(serializeTransaction),
      classSchedule: studentProfile.class
        ? {
            name: studentProfile.class.name,
            subject: studentProfile.class.subject,
            schedule: studentProfile.class.schedule,
          }
        : null,
      notices,
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['STUDENT']);
