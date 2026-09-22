from pathlib import Path

from app.launcher_helpers import extract_tunnel_url, generate_access_token, write_qr_code


def test_access_token_is_random_and_url_safe():
    first = generate_access_token()
    second = generate_access_token()

    assert first != second
    assert len(first) >= 40
    assert all(character.isalnum() or character in "-_" for character in first)


def test_extract_tunnel_url_uses_latest_trycloudflare_url():
    output = """
    INF https://first-example.trycloudflare.com
    retrying
    INF Your quick Tunnel has been created! https://fresh-demo.trycloudflare.com
    """

    assert extract_tunnel_url(output) == "https://fresh-demo.trycloudflare.com"


def test_qr_code_is_written_locally(tmp_path: Path):
    destination = tmp_path / "phone.png"

    write_qr_code("https://demo.trycloudflare.com/?access_token=secret", destination)

    assert destination.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
