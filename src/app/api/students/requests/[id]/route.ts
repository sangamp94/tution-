import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });

    const { verifyToken } = await import('@/lib/auth');
    let auth;
    try { auth = verifyToken(authHeader.slice(7).trim()); } catch { return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }); }
    if (auth.role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden: teacher access required' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const action = body?.action === 'reject' ? 'reject' : body?.action === 'approve' ? 'approve' : '';
    if (!action) return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });

    const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
    if (!tuition) return NextResponse.json({ error: 'Tuition not found' }, { status: 404 });

    const request = await prisma.studentSignupRequest.findUnique({ where: { id: params.id } });
    if (!request || request.tuition_id !== tuition.id) return NextResponse.json({ error: 'Signup request not found' }, { status: 404 });
    if (request.status !== 'PENDING') return NextResponse.json({ error: `Request is already ${request.status.toLowerCase()}` }, { status: 409 });

    if (action === 'reject') {
      await prisma.studentSignupRequest.update({ where: { id: request.id }, data: { status: 'REJECTED', reviewed_at: new Date() } });
      return NextResponse.json({ request_id: request.id, status: 'REJECTED', message: 'Student signup request rejected' });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone: request.phone } });
    if (existingUser) return NextResponse.json({ error: 'A user with this phone number already exists' }, { status: 409 });

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: request.name,
          phone: request.phone,
          password_hash: request.password_hash,
          role: 'STUDENT',
          studentsInfo: {
            create: {
              tuition_id: tuition.id,
              grade_class: request.grade_class,
              custom_fee: request.custom_fee,
            },
          },
        },
        include: { studentsInfo: true },
      });

      await tx.studentSignupRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED', reviewed_at: new Date() },
      });

      return user;
    });

    return NextResponse.json({
      request_id: request.id,
      status: 'APPROVED',
      message: 'Student approved. Account is now active and can log in.',
      student: { id: result.studentsInfo[0].id, user_id: result.id, name: result.name, phone: result.phone },
    });
  } catch (err) {
    console.error('Signup request review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
