import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

type RouteContext = { params: Record<string, string | string[]> };

function getId(ctx: RouteContext) {
  const raw = ctx?.params?.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

async function ownedNotice(id: string, userId: string) {
  const tuition = await prisma.tuition.findUnique({ where: { tutor_id: userId }, select: { id: true } });
  if (!tuition) return null;
  return prisma.notice.findFirst({ where: { id, tuition_id: tuition.id } });
}

export const PATCH = withAuth(async (req: NextRequest, ctx, auth) => {
  try {
    const id = getId(ctx);
    if (!id) return NextResponse.json({ error: 'Notice id is required' }, { status: 400 });
    const existing = await ownedNotice(id, auth.userId);
    if (!existing) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });

    const body = await req.json().catch(() => null);
    const title = typeof body?.title === 'string' ? body.title.trim() : undefined;
    const content = typeof body?.content === 'string' ? body.content.trim() : typeof body?.description === 'string' ? body.description.trim() : undefined;
    if (title === '' || content === '') return NextResponse.json({ error: 'title/content cannot be empty' }, { status: 400 });

    const notice = await prisma.notice.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content, description: content } : {}),
        ...(typeof body?.target_role === 'string' ? { target_role: body.target_role } : {}),
      },
    });
    return NextResponse.json({ notice });
  } catch (err) {
    console.error('Notice update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);

export const DELETE = withAuth(async (_req: NextRequest, ctx, auth) => {
  try {
    const id = getId(ctx);
    if (!id) return NextResponse.json({ error: 'Notice id is required' }, { status: 400 });
    const existing = await ownedNotice(id, auth.userId);
    if (!existing) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    await prisma.notice.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Notice deleted successfully' });
  } catch (err) {
    console.error('Notice delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
