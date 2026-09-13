import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const tutorPhone = typeof body?.tutor_phone === 'string' ? body.tutor_phone.trim() : '';
    const gradeClass = typeof body?.grade_class === 'string' ? body.grade_class.trim() : null;

    if (!name || !phone || !tutorPhone || password.length < 6) {
      return NextResponse.json({ error: 'name, phone, tutor_phone and password (6+ chars) are required' }, { status: 400 });
    }

    if (await prisma.user.findUnique({ where: { phone } })) {
      return NextResponse.json({ error: 'This phone number already has an account' }, { status: 409 });
    }

    const tuition = await prisma.tuition.findFirst({
      where: { tutor: { phone: tutorPhone, role: 'TEACHER' } },
      select: { id: true, name: true, tutor: { select: { name: true } } },
    });
    if (!tuition) return NextResponse.json({ error: 'Tutor not found or tuition is not set up' }, { status: 404 });

    const existingRequest = await prisma.studentSignupRequest.findFirst({ where: { phone, status: 'PENDING' } });
    if (existingRequest) return NextResponse.json({ error: 'A signup request is already pending for this phone number', request_id: existingRequest.id }, { status: 409 });

    const password_hash = await hashPassword(password);
    const request = await prisma.studentSignupRequest.create({
      data: { tuition_id: tuition.id, name, phone, password_hash, grade_class: gradeClass },
    });

    return NextResponse.json({
      request_id: request.id,
      status: request.status,
      message: `Signup request sent to ${tuition.tutor.name}. Your account will be created after tutor approval.`,
      tuition: { id: tuition.id, name: tuition.name },
    }, { status: 201 });
  } catch (err) {
    console.error('Student signup request error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
