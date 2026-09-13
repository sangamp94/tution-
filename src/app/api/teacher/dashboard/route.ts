import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const GET = withAuth(async (_req, _ctx, auth) => {
  try {
    const teacherId = auth.userId;

    const classes = await prisma.class.findMany({
      where: { teacher_id: teacherId },
      select: { id: true },
    });
    const classIds = classes.map((c) => c.id);

    const totalStudents = await prisma.studentProfile.count({
      where: { class_id: { in: classIds } },
    });

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const feesResult = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        month: monthKey,
        status: 'PAID',
        student: { class_id: { in: classIds } },
      },
    });

    const recentNotices = await prisma.notice.findMany({
      where: { OR: [{ target_role: 'ALL' }, { target_role: 'TEACHER' }] },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      totalStudents,
      totalFeesCollectedThisMonth: Number(feesResult._sum.amount ?? 0),
      month: monthKey,
      recentNotices,
    });
  } catch (err) {
    console.error('Teacher dashboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
