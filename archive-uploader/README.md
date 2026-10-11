# Archive URL Uploader (Tuition Auth repository)

A separate Render Background Worker kept in this subfolder so it does not interfere with the existing Next.js/Prisma Tuition Auth backend.

**Only upload videos you own or are authorized to redistribute.** This tool does not hide copyrighted uploads or bypass takedowns. Use accurate metadata and respect the source's download terms.

## Deploy on Render

Create a Background Worker from this repository and set its **Root Directory** to `archive-uploader`.

- Build command: `pip install -r requirements.txt`
- Start command: `python worker.py`

Set these environment variables privately in Render:

Required: `SOURCE_URL`, `IA_ACCESS_KEY`, `IA_SECRET_KEY`, `IA_IDENTIFIER`, `IA_TITLE`, `IA_DESCRIPTION`.

Optional: `IA_CREATOR`, `IA_LICENSE_URL`, `MAX_BYTES` (default 2 GB).

Never commit access keys, secret keys, or private source URLs to GitHub. This code has been added to the repository only; it has not been deployed and no upload has been started.
