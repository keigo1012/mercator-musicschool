import app from "../.open-next/worker.js";

const encoder = new TextEncoder();

async function timingSafeEqual(left, right) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;

  for (let index = 0; index < leftBytes.byteLength; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }

  return difference === 0;
}

function authenticationRequired() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Mercator preview", charset="UTF-8"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function authenticationUnavailable() {
  return new Response("Preview authentication is not configured.", {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function hasValidCredentials(request, env) {
  const username = env.PREVIEW_AUTH_USERNAME;
  const password = env.PREVIEW_AUTH_PASSWORD;

  if (!username || !password) {
    return false;
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Basic ")) {
    return false;
  }

  try {
    const credentials = atob(authorization.slice("Basic ".length));
    const separator = credentials.indexOf(":");
    if (separator === -1) {
      return false;
    }

    const [usernameMatches, passwordMatches] = await Promise.all([
      timingSafeEqual(credentials.slice(0, separator), username),
      timingSafeEqual(credentials.slice(separator + 1), password),
    ]);
    return usernameMatches && passwordMatches;
  } catch {
    return false;
  }
}

const previewAuthWorker = {
  async fetch(request, env, ctx) {
    if (!env.PREVIEW_AUTH_USERNAME || !env.PREVIEW_AUTH_PASSWORD) {
      return authenticationUnavailable();
    }

    if (!(await hasValidCredentials(request, env))) {
      return authenticationRequired();
    }

    return app.fetch(request, env, ctx);
  },
};

export default previewAuthWorker;
