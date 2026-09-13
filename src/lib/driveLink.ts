// The teacher uploads the PDF to Google Drive themselves (via drive.google.com
// or the Drive app), sets sharing to "Anyone with the link", and pastes that
// link into the app. No Google service account / API credentials needed.

const DRIVE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/file/d/<id>/view
  /[?&]id=([a-zA-Z0-9_-]+)/, // https://drive.google.com/open?id=<id>
];

export function parseDriveFileId(link: string): string | null {
  for (const pattern of DRIVE_ID_PATTERNS) {
    const match = link.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function toViewLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
