import { createSign } from "node:crypto";
import { firebaseConfig } from "./config";

type FirestoreFields = Record<string, FirestoreValue>;
type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: FirestoreFields } };

type ArrayUnionValue = {
  __fieldValue: "arrayUnion";
  values: unknown[];
};

type Write = {
  update?: { name: string; fields: FirestoreFields };
  updateMask?: { fieldPaths: string[] };
  updateTransforms?: Array<{ fieldPath: string; appendMissingElements: { values: FirestoreValue[] } }>;
  delete?: string;
};

let firestoreAccessToken: { token: string; expiresAt: number } | null = null;

function getProjectId() {
  return firebaseConfig.projectId;
}

function getApiKey() {
  return firebaseConfig.apiKey;
}

function getServiceAccount() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("Firebase Admin API連携の環境変数が未設定です。");
  return { clientEmail, privateKey };
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function getFirestoreAccessToken() {
  if (firestoreAccessToken && firestoreAccessToken.expiresAt > Date.now() + 60_000) return firestoreAccessToken.token;

  const { clientEmail, privateKey } = getServiceAccount();
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
  const data = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string; error_description?: string } | null;
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || "Firestore APIの認証に失敗しました。");
  }

  firestoreAccessToken = { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
  return firestoreAccessToken.token;
}

async function firestoreFetch(path: string, init: RequestInit = {}) {
  const token = await getFirestoreAccessToken();
  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) as Record<string, unknown> : {};
  if (!response.ok) {
    const error = data.error as { message?: string } | undefined;
    throw new Error(error?.message || "Firestore API連携に失敗しました。");
  }
  return data as unknown;
}

function documentsPath() {
  return `projects/${getProjectId()}/databases/(default)/documents`;
}

function docPath(collection: string, id: string) {
  return `${documentsPath()}/${collection}/${id}`;
}

function isArrayUnion(value: unknown): value is ArrayUnionValue {
  return Boolean(value && typeof value === "object" && (value as { __fieldValue?: string }).__fieldValue === "arrayUnion");
}

function encodeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "object") {
    return { mapValue: { fields: encodeFirestoreFields(value as Record<string, unknown>) } };
  }
  return { stringValue: String(value) };
}

function encodeFirestoreFields(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => !isArrayUnion(value)).map(([key, value]) => [key, encodeFirestoreValue(value)]));
}

function decodeFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields ?? {});
  return undefined;
}

function decodeFirestoreFields(fields: FirestoreFields): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function writeForUpdate(ref: DocumentReference, data: Record<string, unknown>, updateMask = true): Write {
  const fields = encodeFirestoreFields(data);
  const transformEntries = Object.entries(data).filter(([, value]) => isArrayUnion(value)) as Array<[string, ArrayUnionValue]>;
  const write: Write = { update: { name: ref.name, fields } };
  const fieldPaths = Object.keys(fields);
  if (updateMask && fieldPaths.length) write.updateMask = { fieldPaths };
  if (transformEntries.length) {
    write.updateTransforms = transformEntries.map(([fieldPath, value]) => ({
      fieldPath,
      appendMissingElements: { values: value.values.map(encodeFirestoreValue) },
    }));
  }
  return write;
}

export class DocumentSnapshot {
  constructor(public ref: DocumentReference, private document: { name: string; fields?: FirestoreFields } | null) {}
  get id() {
    return this.ref.id;
  }
  get exists() {
    return Boolean(this.document);
  }
  data(): Record<string, unknown> {
    return this.document?.fields ? decodeFirestoreFields(this.document.fields) : {};
  }
}

export class QuerySnapshot {
  constructor(public docs: DocumentSnapshot[]) {}
}

export class DocumentReference {
  constructor(public collectionName: string, public id: string) {}
  get name() {
    return docPath(this.collectionName, this.id);
  }
  async get() {
    const response = await fetch(`https://firestore.googleapis.com/v1/${this.name}`, {
      headers: { authorization: `Bearer ${await getFirestoreAccessToken()}` },
    });
    if (response.status === 404) return new DocumentSnapshot(this, null);
    const data = await response.json() as { name: string; fields?: FirestoreFields; error?: { message?: string } };
    if (!response.ok) throw new Error(data.error?.message || "Firestore API連携に失敗しました。");
    return new DocumentSnapshot(this, data);
  }
  async set(data: Record<string, unknown>) {
    await adminDb.commit([writeForUpdate(this, data, false)]);
  }
  async update(data: Record<string, unknown>) {
    await adminDb.commit([writeForUpdate(this, data, true)]);
  }
  async delete() {
    await adminDb.commit([{ delete: this.name }]);
  }
}

class QueryReference {
  constructor(private collectionName: string, private field: string, private value: unknown) {}
  async get() {
    const data = await firestoreFetch(`${documentsPath()}:runQuery`, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: this.collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: this.field },
              op: "EQUAL",
              value: encodeFirestoreValue(this.value),
            },
          },
        },
      }),
    }) as Array<{ document?: { name: string; fields?: FirestoreFields } }>;
    const docs = data.filter((item) => item.document).map((item) => {
      const document = item.document!;
      return new DocumentSnapshot(new DocumentReference(this.collectionName, document.name.split("/").pop() ?? ""), document);
    });
    return new QuerySnapshot(docs);
  }
}

class CollectionReference {
  constructor(private collectionName: string) {}
  doc(id = crypto.randomUUID().replaceAll("-", "")) {
    return new DocumentReference(this.collectionName, id);
  }
  async add(data: Record<string, unknown>) {
    const ref = this.doc();
    await ref.set({ ...data, id: ref.id });
    return ref;
  }
  async get() {
    const data = await firestoreFetch(`${documentsPath()}/${this.collectionName}`) as { documents?: Array<{ name: string; fields?: FirestoreFields }> };
    const docs = (data.documents ?? []).map((document) => new DocumentSnapshot(new DocumentReference(this.collectionName, document.name.split("/").pop() ?? ""), document));
    return new QuerySnapshot(docs);
  }
  where(field: string, operator: "==", value: unknown) {
    if (operator !== "==") throw new Error("この検索条件は未対応です。");
    return new QueryReference(this.collectionName, field, value);
  }
}

class Transaction {
  private writes: Write[] = [];
  constructor(private transactionId: string) {}
  async get(ref: DocumentReference) {
    const data = await firestoreFetch(`${documentsPath()}:batchGet`, {
      method: "POST",
      body: JSON.stringify({ documents: [ref.name], transaction: this.transactionId }),
    }) as Array<{ found?: { name: string; fields?: FirestoreFields }; missing?: string }>;
    const found = data.find((item) => item.found)?.found;
    return new DocumentSnapshot(ref, found ?? null);
  }
  set(ref: DocumentReference, data: Record<string, unknown>) {
    this.writes.push(writeForUpdate(ref, data, false));
  }
  update(ref: DocumentReference, data: Record<string, unknown>) {
    this.writes.push(writeForUpdate(ref, data, true));
  }
  delete(ref: DocumentReference) {
    this.writes.push({ delete: ref.name });
  }
  getWrites() {
    return this.writes;
  }
}

export const adminDb = {
  collection(name: string) {
    return new CollectionReference(name);
  },
  async commit(writes: Write[], transaction?: string) {
    await firestoreFetch(`${documentsPath()}:commit`, {
      method: "POST",
      body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) }),
    });
  },
  async runTransaction<T>(callback: (transaction: Transaction) => Promise<T>) {
    const started = await firestoreFetch(`${documentsPath()}:beginTransaction`, { method: "POST", body: "{}" }) as { transaction: string };
    const transaction = new Transaction(started.transaction);
    const result = await callback(transaction);
    await this.commit(transaction.getWrites(), started.transaction);
    return result;
  },
};

export const adminAuth = {
  async verifyIdToken(token: string) {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(getApiKey())}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
    const data = await response.json().catch(() => null) as { users?: Array<{ localId: string; email?: string; displayName?: string }>; error?: { message?: string } } | null;
    if (!response.ok || !data?.users?.[0]) throw new Error(data?.error?.message || "ログインが必要です。");
    return { uid: data.users[0].localId, email: data.users[0].email, displayName: data.users[0].displayName };
  },
};

export const FieldValue = {
  arrayUnion(...values: unknown[]) {
    return { __fieldValue: "arrayUnion", values } as ArrayUnionValue;
  },
};

export const serverTimestamp = () => new Date().toISOString();

export function serializeFirestore<T>(value: T): T {
  return value;
}
