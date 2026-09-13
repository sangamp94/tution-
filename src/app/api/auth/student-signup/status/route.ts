import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const requestId = new URL(req.url).searchParams.get('requestId')?.trim();
    if (!requestId) return NextResponse.json({ error: 'requestId is required' }, { status: 400 });

    const request = await prisma.studentSignupRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, name: true, phone: true, reviewed_at: true, tuition: { select: { name: true } } },
    });
    if (!request) return NextResponse.json({ error: 'Signup request not found' }, { status: 404 });

    return NextResponse.json({
      request_id: request.id,
      status: request.status,
      name: request.name,
      phone: request.phone,
      tuition: request.tuition,
      reviewed_at: request.reviewed_at,
      message: request.status === 'PENDING'
        ? 'Your request is waiting for tutor approval.'
        : request.status === 'APPROVED'
          ? 'Your account has been approved. You can now log in.'
          : 'Your signup request was rejected by the tutor.',
    });
  } catch (err) {
    console.error('Student signup status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
