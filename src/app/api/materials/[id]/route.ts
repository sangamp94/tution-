import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

async function ownedMaterial(id: string, userId: string) {
  const tuition = await prisma.tuition.findUnique({ where: { tutor_id: userId }, select: { id: true } });
  if (!tuition) return null;
  return prisma.material.findFirst({ where: { id, class: { tuition_id: tuition.id } } });
}

export const PATCH = withAuth(async (req: NextRequest, ctx, auth) => {
  try {
    if (auth.role !== 'TEACHER') return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    const id = ctx?.params?.id;
    if (!id) return NextResponse.json({ error: 'Material id is required' }, { status: 400 });
    const existing = await ownedMaterial(id, auth.userId);
    if (!existing) return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    const body = await req.json().catch(() => null);
    const data: { title?: string; drive_view_link?: string; drive_file_id?: string } = {};
    if (typeof body?.title === 'string' && body.title.trim()) data.title = body.title.trim();
    if (typeof body?.drive_view_link === 'string' && body.drive_view_link.trim()) {
      const link = body.drive_view_link.trim();
      let parsed: URL;
      try { parsed = new URL(link); } catch { return NextResponse.json({ error: 'Invalid Google Drive URL' }, { status: 400 }); }
      if (!['drive.google.com', 'docs.google.com'].includes(parsed.hostname)) return NextResponse.json({ error: 'Only Google Drive URLs are allowed' }, { status: 400 });
      const fileId = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? parsed.searchParams.get('id');
      if (!fileId) return NextResponse.json({ error: 'Could not extract Google Drive file ID' }, { status: 400 });
      data.drive_view_link = link;
      data.drive_file_id = fileId;
    }
    if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    const material = await prisma.material.update({ where: { id }, data });
    return NextResponse.json({ material });
  } catch (err) {
    console.error('Material update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);

export const DELETE = withAuth(async (_req: NextRequest, ctx, auth) => {
  try {
    if (auth.role !== 'TEACHER') return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    const id = ctx?.params?.id;
    if (!id) return NextResponse.json({ error: 'Material id is required' }, { status: 400 });
    const existing = await ownedMaterial(id, auth.userId);
    if (!existing) return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Study material deleted successfully' });
  } catch (err) {
    console.error('Material delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
