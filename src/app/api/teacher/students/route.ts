import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/withAuth';
import { serializeStudentProfile } from '@/lib/serialize';

export const POST = withAuth(async (req, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const {
      name,
      phone,
      password,
      class_id,
      parent_name,
      parent_phone,
      monthly_fee,
      address,
    } = body ?? {};

    if (!name || !phone || !password || monthly_fee === undefined) {
      return NextResponse.json(
        { error: 'name, phone, password and monthly_fee are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this phone already exists' }, { status: 409 });
    }

    // If a class is given, make sure it belongs to the requesting teacher.
    if (class_id) {
      const cls = await prisma.class.findUnique({ where: { id: class_id } });
      if (!cls || cls.teacher_id !== auth.userId) {
        return NextResponse.json({ error: 'Invalid class_id' }, { status: 400 });
      }
    }

    const password_hash = await hashPassword(password);

    const student = await prisma.user.create({
      data: {
        name,
        phone,
        password_hash,
        role: 'STUDENT',
        studentProfile: {
          create: {
            class_id: class_id ?? null,
            parent_name,
            parent_phone,
            monthly_fee,
            address,
          },
        },
      },
      include: { studentProfile: true },
    });

    const { password_hash: _omit, studentProfile, ...safeUser } = student;

    return NextResponse.json(
      {
        student: {
          ...safeUser,
          studentProfile: studentProfile ? serializeStudentProfile(studentProfile) : null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create student error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
