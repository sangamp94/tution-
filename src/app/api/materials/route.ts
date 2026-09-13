import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const GET = withAuth(async (_req: NextRequest, _ctx, auth) => {
  try {
    const tuitionId = auth.role === 'TEACHER'
      ? (await prisma.tuition.findUnique({ where: { tutor_id: auth.userId }, select: { id: true } }))?.id ?? null
      : (await prisma.studentInfo.findUnique({ where: { user_id: auth.userId }, select: { tuition_id: true } }))?.tuition_id ?? null;
    if (!tuitionId) return NextResponse.json({ materials: [] });
    const materials = await prisma.material.findMany({
      where: { class: { tuition_id: tuitionId } },
      include: { class: { select: { id: true, name: true, subject: true } } },
      orderBy: { uploaded_at: 'desc' },
    });
    return NextResponse.json({ materials });
  } catch (err) {
    console.error('Material list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    if (auth.role !== 'TEACHER') return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    const body = await req.json().catch(() => null);
    const classId = typeof body?.class_id === 'string' ? body.class_id.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const link = typeof body?.drive_view_link === 'string' ? body.drive_view_link.trim() : '';
    if (!classId || !title || !link) return NextResponse.json({ error: 'class_id, title and drive_view_link are required' }, { status: 400 });
    const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId }, select: { id: true } });
    if (!tuition) return NextResponse.json({ error: 'Set up tuition first' }, { status: 400 });
    const cls = await prisma.class.findFirst({ where: { id: classId, tuition_id: tuition.id }, select: { id: true } });
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    let parsed: URL;
    try { parsed = new URL(link); } catch { return NextResponse.json({ error: 'Invalid Google Drive URL' }, { status: 400 }); }
    if (!['drive.google.com', 'docs.google.com'].includes(parsed.hostname)) return NextResponse.json({ error: 'Only Google Drive URLs are allowed' }, { status: 400 });
    const id = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? parsed.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Could not extract Google Drive file ID' }, { status: 400 });
    const material = await prisma.material.create({ data: { class_id: cls.id, title, drive_file_id: id, drive_view_link: link } });
    return NextResponse.json({ material }, { status: 201 });
  } catch (err) {
    console.error('Material create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
