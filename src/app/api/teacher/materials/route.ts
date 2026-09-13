import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';
import { parseDriveFileId, toViewLink } from '@/lib/driveLink';

// Body: { class_id, title, drive_link }
// drive_link is a normal Drive share link the teacher already made public
// ("Anyone with the link" -> Viewer). No Google API calls happen here -
// everything else in this project only needs DATABASE_URL / DIRECT_URL /
// JWT_SECRET to run.
export const POST = withAuth(async (req, _ctx, auth) => {
  try {
    const body = await req.json().catch(() => null);
    const { class_id, title, drive_link } = body ?? {};

    if (!class_id || !title || !drive_link) {
      return NextResponse.json(
        { error: 'class_id, title and drive_link are required' },
        { status: 400 }
      );
    }

    const cls = await prisma.class.findUnique({ where: { id: class_id } });
    if (!cls || cls.teacher_id !== auth.userId) {
      return NextResponse.json({ error: 'Invalid class_id' }, { status: 400 });
    }

    const fileId = parseDriveFileId(drive_link);
    if (!fileId) {
      return NextResponse.json(
        {
          error:
            'Could not read a file ID from that link. Paste the "Anyone with the link" share link from Google Drive.',
        },
        { status: 400 }
      );
    }

    const material = await prisma.material.create({
      data: {
        class_id,
        title,
        drive_file_id: fileId,
        drive_view_link: toViewLink(fileId),
      },
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (err) {
    console.error('Save material error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, ['TEACHER']);
