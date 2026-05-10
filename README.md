# Niko Edge Gateway

Lightweight Netlify Edge gateway that forwards incoming requests to an upstream HTTPS target with an explicit port.

## How it works

- Netlify serves `public/index.html` statically at `/` (no Edge invocation).
- Netlify routes only `/relay/*` requests to the `upstream-gateway` edge function.
- The function strips the leading `/relay` prefix, then forwards the remaining `pathname + query` to the upstream base domain.
- Upstream domain resolution order:
  1. `TARGET_DOMAIN` environment variable (if set)
  2. Built-in fallback: `https://xray.nikgem.com:443`


## Relay URL mapping

- Public relay URL format: `https://YOUR_NETLIFY_SITE/relay/...`
- Forwarded upstream URL format: `TARGET_DOMAIN/...`

Example mapping:

- Incoming: `https://MY_NETLIFY_SITE.netlify.app/relay/some/path?x=1`
- Upstream: `https://xray.nikgem.com:443/some/path?x=1`

## Required upstream format

`TARGET_DOMAIN` must be:

- `https://` scheme
- A hostname
- An explicit port

Example valid values:

- `https://xray.nikgem.com:443`
- `https://api.example.com:8443`

## Project structure

```txt
.
├── netlify/
│   └── edge-functions/
│       └── upstream-gateway.js
├── public/
│   └── index.html
├── netlify.toml
├── package.json
└── README.md
```

## Netlify deployment settings

- **Build command:** `npm run build`
- **Publish directory:** `public`
- **Edge function route:** `/relay/*` → `upstream-gateway`

## Optional environment variable

- `TARGET_DOMAIN` (optional override)

If omitted, the project uses `https://xray.nikgem.com:443`.

## Local development

```bash
npm install
npm run dev
```

## Validation and error behavior

- Invalid `TARGET_DOMAIN` format returns a configuration `500` response.
- Upstream connection failure returns `502 Bad Gateway`.

## License

MIT
