import os
import re
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import requests
from internetarchive import upload


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def validate_identifier(identifier: str) -> None:
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{2,99}", identifier):
        raise RuntimeError(
            "IA_IDENTIFIER must be 3-100 characters, lowercase letters, "
            "numbers, underscores or hyphens, and start with a letter/number."
        )


def main() -> int:
    source_url = required("SOURCE_URL")
    access_key = required("IA_ACCESS_KEY")
    secret_key = required("IA_SECRET_KEY")
    identifier = required("IA_IDENTIFIER")
    title = required("IA_TITLE")
    description = required("IA_DESCRIPTION")

    parsed = urlparse(source_url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise RuntimeError("SOURCE_URL must be a valid HTTPS URL.")
    validate_identifier(identifier)

    max_bytes = int(os.environ.get("MAX_BYTES", str(2 * 1024**3)))
    if max_bytes <= 0:
        raise RuntimeError("MAX_BYTES must be a positive integer.")

    print("Checking source URL...")
    with requests.get(
        source_url,
        stream=True,
        timeout=(20, 60),
        headers={"User-Agent": "AuthorizedArchiveUploader/1.0"},
        allow_redirects=True,
    ) as response:
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "").lower()
        length_header = response.headers.get("Content-Length")
        total_length = int(length_header) if length_header and length_header.isdigit() else None

        if total_length is not None and total_length > max_bytes:
            raise RuntimeError(f"Source is larger than MAX_BYTES ({max_bytes}).")
        if content_type.startswith("text/") or "html" in content_type or "json" in content_type:
            raise RuntimeError(
                f"Source returned {content_type or 'an unknown content type'}, "
                "not an apparent direct media download."
            )

        suffix = Path(urlparse(response.url).path).suffix.lower()
        if suffix not in {".mp4", ".m4v", ".mov", ".webm", ".mkv", ".avi", ".mpeg", ".mpg"}:
            suffix = ".media"

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(prefix="ia_upload_", suffix=suffix, delete=False) as tmp:
                temp_path = tmp.name
                downloaded = 0
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if not chunk:
                        continue
                    downloaded += len(chunk)
                    if downloaded > max_bytes:
                        raise RuntimeError(f"Download exceeded MAX_BYTES ({max_bytes}).")
                    tmp.write(chunk)

            if downloaded == 0:
                raise RuntimeError("The source returned an empty file.")

            print(f"Fetched {downloaded} bytes. Uploading item {identifier!r}...")
            metadata = {
                "mediatype": "movies",
                "title": title,
                "description": description,
            }
            creator = os.environ.get("IA_CREATOR", "").strip()
            license_url = os.environ.get("IA_LICENSE_URL", "").strip()
            if creator:
                metadata["creator"] = creator
            if license_url:
                metadata["licenseurl"] = license_url

            results = upload(
                identifier,
                {Path(temp_path).name: temp_path},
                metadata=metadata,
                access_key=access_key,
                secret_key=secret_key,
                retries=3,
                verbose=True,
            )
            failures = [item for item in results if not getattr(item, "ok", False)]
            if failures:
                raise RuntimeError("Internet Archive reported one or more failed upload responses.")
            print(f"Upload request completed: https://archive.org/details/{identifier}")
            return 0
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
                print("Temporary source file deleted.")

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
