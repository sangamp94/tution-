import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/withAuth';

export const POST = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const gradeClass = typeof body?.grade_class === 'string' ? body.grade_class.trim() : null;
    const joiningDate = body?.joining_date ? new Date(body.joining_date) : new Date();
    if (!name || !phone || password.length < 6) return NextResponse.json({ error: 'name, phone and password (6+ chars) are required' }, { status: 400 });
    if (Number.isNaN(joiningDate.getTime())) return NextResponse.json({ error: 'Invalid joining_date' }, { status: 400 });
    const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
    if (!tuition) return NextResponse.json({ error: 'Set up tuition first' }, { status: 400 });
    if (await prisma.user.findUnique({ where: { phone } })) return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    const customFee = body?.custom_fee === null || body?.custom_fee === undefined ? null : Number(body.custom_fee);
    if (customFee !== null && (!Number.isFinite(customFee) || customFee < 0)) return NextResponse.json({ error: 'Invalid custom_fee' }, { status: 400 });
    const password_hash = await hashPassword(password);
    const user = await prisma.user.create({ data: { name, phone, password_hash, role: 'STUDENT', studentsInfo: { create: { tuition_id: tuition.id, grade_class: gradeClass, joining_date: joiningDate, custom_fee: customFee } } }, include: { studentsInfo: true } });
    return NextResponse.json({ student: { id: user.studentsInfo[0].id, user_id: user.id, name: user.name, phone: user.phone, grade_class: user.studentsInfo[0].grade_class, joining_date: user.studentsInfo[0].joining_date, custom_fee: user.studentsInfo[0].custom_fee } }, { status: 201 });
  } catch (err) {
    console.error('Student create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);

export const GET = withAuth(async (_req: NextRequest, _ctx, auth) => {
  try {
    let tuitionId: string | null = null;

    if (auth.role === 'TEACHER') {
      const tuition = await prisma.tuition.findUnique({
        where: { tutor_id: auth.userId },
        select: { id: true },
      });
      tuitionId = tuition?.id ?? null;
    } else {
      const student = await prisma.studentInfo.findUnique({
        where: { user_id: auth.userId },
        select: { tuition_id: true },
      });
      tuitionId = student?.tuition_id ?? null;
    }

    if (!tuitionId) return NextResponse.json({ students: [] });

    const students = await prisma.studentInfo.findMany({
      where: { tuition_id: tuitionId },
      include: { user: { select: { id: true, name: true, phone: true } } },
      orderBy: { joining_date: 'desc' },
    });
    return NextResponse.json({ students });
  } catch (err) {
    console.error('Student list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    if (auth.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can delete students' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const studentId = typeof body?.student_id === 'string' ? body.student_id.trim() : '';
    const userId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';

    if (!studentId && !userId) {
      return NextResponse.json({ error: 'student_id or user_id is required' }, { status: 400 });
    }

    const tuition = await prisma.tuition.findUnique({
      where: { tutor_id: auth.userId },
      select: { id: true },
    });
    if (!tuition) {
      return NextResponse.json({ error: 'Tuition not found' }, { status: 404 });
    }

    const student = await prisma.studentInfo.findFirst({
      where: {
        tuition_id: tuition.id,
        ...(studentId ? { id: studentId } : { user_id: userId }),
      },
      select: { id: true, user_id: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found in your tuition' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.studentInfo.delete({ where: { id: student.id } });
      await tx.user.delete({ where: { id: student.user_id } });
    });

    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Student delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
