const DEFAULT_TARGET_DOMAIN = "https://xray.nikgem.com:443";
const configuredTarget = (Netlify.env.get("TARGET_DOMAIN") || DEFAULT_TARGET_DOMAIN).trim();

function parseTargetBase(rawTarget) {
  try {
    const parsed = new URL(rawTarget);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.port) return null;
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const TARGET_BASE = parseTargetBase(configuredTarget);

const ALLOWED_REQUEST_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "cache-control",
  "content-type",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "if-unmodified-since",
  "pragma",
  "range",
  "user-agent",
  "sec-websocket-key",
  "sec-websocket-version",
  "sec-websocket-protocol",
  "upgrade",
  "origin",
  "referer",
]);

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
]);

function buildUpstreamHeaders(request) {
  const forwardedHeaders = new Headers();
  const clientIp = request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");

  for (const [key, value] of request.headers) {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey)) continue;
    if (lowerKey === "host") continue;
    if (lowerKey.startsWith("x-nf-") || lowerKey.startsWith("x-netlify-")) continue;
    if (lowerKey.startsWith("x-forwarded-") || lowerKey === "x-real-ip") continue;
    if (!ALLOWED_REQUEST_HEADERS.has(lowerKey)) continue;
    forwardedHeaders.set(lowerKey, value);
  }

  if (clientIp) {
    forwardedHeaders.set("x-forwarded-for", clientIp);
  }

  return forwardedHeaders;
}

function buildTargetUrl(requestUrl) {
  const sourceUrl = new URL(requestUrl);
  return `${TARGET_BASE}${sourceUrl.pathname}${sourceUrl.search}`;
}

export default async function upstreamGateway(request) {
  if (!TARGET_BASE) {
    return new Response(
      "Misconfigured: TARGET_DOMAIN must be an https URL with an explicit port (example: https://xray.nikgem.com:443)",
      { status: 500 },
    );
  }

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  try {
    const upstreamResponse = await fetch(buildTargetUrl(request.url), {
      method,
      headers: buildUpstreamHeaders(request),
      body: hasBody ? request.body : undefined,
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("transfer-encoding");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Bad Gateway: Upstream request failed", { status: 502 });
  }
}
