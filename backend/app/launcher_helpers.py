"""Small, testable helpers used by the Windows Demo V0.1 launcher."""

from __future__ import annotations

import argparse
import re
import secrets
from pathlib import Path


TUNNEL_URL_PATTERN = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com", re.IGNORECASE)


def generate_access_token() -> str:
    return secrets.token_urlsafe(32)


def extract_tunnel_url(output: str) -> str | None:
    matches = TUNNEL_URL_PATTERN.findall(output)
    return matches[-1] if matches else None


def write_qr_code(url: str, destination: Path) -> None:
    import qrcode

    destination.parent.mkdir(parents=True, exist_ok=True)
    image = qrcode.make(url)
    image.save(destination)


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("token")

    extract_parser = subparsers.add_parser("extract-url")
    extract_parser.add_argument("log_file", type=Path)

    qr_parser = subparsers.add_parser("qr")
    qr_parser.add_argument("url")
    qr_parser.add_argument("destination", type=Path)

    args = parser.parse_args()
    if args.command == "token":
        print(generate_access_token())
        return 0
    if args.command == "extract-url":
        url = extract_tunnel_url(args.log_file.read_text(encoding="utf-8", errors="replace"))
        if not url:
            return 1
        print(url)
        return 0
    write_qr_code(args.url, args.destination)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
