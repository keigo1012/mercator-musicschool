import { createSign } from "node:crypto";
import { writeFile } from "node:fs/promises";

const apply = process.argv.includes("--apply");
const backupArg = process.argv.find((argument) => argument.startsWith("--backup="));
const backupPath = backupArg?.slice("--backup=".length) ?? "";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = requireEnv("FIREBASE_PRIVATE_KEY").replaceAll("\\n", "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsignedJwt = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(unsignedJwt).sign(privateKey);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || "Authentication failed.");
  return data.access_token;
}

async function listUsers(projectId, token) {
  const documents = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ pageSize: "300" });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?${params}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Could not list users.");
    documents.push(...(data.documents ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return documents;
}

function inspect(documents) {
  const targets = documents.filter((document) => document.fields?.bookedLessons || document.fields?.bookedLessonDates);
  return {
    targets,
    summary: {
      scannedUsers: documents.length,
      affectedUsers: targets.length,
      withBookedLessons: targets.filter((document) => document.fields?.bookedLessons).length,
      withBookedLessonDates: targets.filter((document) => document.fields?.bookedLessonDates).length,
    },
  };
}

async function removeFields(document, token) {
  const params = new URLSearchParams();
  params.append("updateMask.fieldPaths", "bookedLessons");
  params.append("updateMask.fieldPaths", "bookedLessonDates");
  params.set("currentDocument.updateTime", document.updateTime);
  const response = await fetch(`https://firestore.googleapis.com/v1/${document.name}?${params}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ fields: {} }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Could not update ${document.name}.`);
}

async function main() {
  if (apply && !backupPath) throw new Error("--apply requires an explicit --backup=/absolute/path.json option.");
  const projectId = requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const token = await getAccessToken();
  const documents = await listUsers(projectId, token);
  const { targets, summary } = inspect(documents);

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", ...summary }, null, 2));
    return;
  }

  const backup = targets.map((document) => ({
    name: document.name,
    updateTime: document.updateTime,
    fields: {
      ...(document.fields.bookedLessons ? { bookedLessons: document.fields.bookedLessons } : {}),
      ...(document.fields.bookedLessonDates ? { bookedLessonDates: document.fields.bookedLessonDates } : {}),
    },
  }));
  await writeFile(backupPath, `${JSON.stringify(backup, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });

  for (const target of targets) await removeFields(target, token);

  const verification = inspect(await listUsers(projectId, token)).summary;
  console.log(JSON.stringify({ mode: "apply", backupPath, removedUsers: targets.length, verification }, null, 2));
  if (verification.affectedUsers !== 0) throw new Error("Verification failed: cached booking fields still exist.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
