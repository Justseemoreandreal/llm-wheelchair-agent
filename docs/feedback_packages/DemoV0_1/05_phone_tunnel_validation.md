# Phone Tunnel Validation

- Quick Tunnel URL obtained: PASS (`https://*.trycloudflare.com`).
- Local QR PNG generated without external QR service: PASS.
- URL copied to clipboard: best effort path executed successfully in this environment.
- Valid Token public page: HTTP 200 and expected page title.
- Missing Token public page: HTTP 401.
- Public WSS with Token: connected and completed P0/latch/reset sequence.
- Exit teardown: local URL and temporary public URL became unavailable; Token/PID files removed.
- Cloudflare account: not required.
- Real physical phone: **USER TEST REQUIRED**.

The exact temporary hostname and Token are intentionally not archived.
