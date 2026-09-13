import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const POST = withAuth(async (req: NextRequest, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : typeof body?.description === 'string' ? body.description.trim() : '';
    if (!title || !content) return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    const tuition = await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } });
    if (!tuition) return NextResponse.json({ error: 'Set up tuition first' }, { status: 400 });
    const notice = await prisma.notice.create({ data: { tuition_id: tuition.id, title, description: content, content, target_role: body?.target_role ?? 'ALL' } });
    return NextResponse.json({ notice }, { status: 201 });
  } catch (err) { console.error('Notice create error:', err); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}, ['TEACHER']);

export const GET = withAuth(async (_req: NextRequest, _ctx, auth) => {
  try {
    const tuition = auth.role === 'TEACHER' ? await prisma.tuition.findUnique({ where: { tutor_id: auth.userId } }) : (await prisma.studentInfo.findUnique({ where: { user_id: auth.userId } }))?.tuition;
    if (!tuition) return NextResponse.json({ notices: [] });
    const notices = await prisma.notice.findMany({ where: { tuition_id: tuition.id, ...(auth.role === 'STUDENT' ? { OR: [{ target_role: 'ALL' }, { target_role: 'STUDENT' }] } : {}) }, orderBy: { created_at: 'desc' }, take: 50 });
    return NextResponse.json({ notices });
  } catch (err) { console.error('Notice list error:', err); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
});
