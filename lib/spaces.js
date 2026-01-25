const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const SPACE_SCOPES = ["public", "private"];

function getEnvVarName(base, scope) {
  return `SPACES_${base}_${scope.toUpperCase()}`;
}

function resolveSpaceEnv(scope) {
  if (!SPACE_SCOPES.includes(scope)) {
    throw new Error(`Unknown Spaces scope "${scope}". Expected ${SPACE_SCOPES.join(", ")}`);
  }

  const allowLegacy = scope === "public";
  const regionKey = getEnvVarName("REGION", scope);
  const keyKey = getEnvVarName("KEY", scope);
  const secretKey = getEnvVarName("SECRET", scope);

  const region =
    process.env[regionKey] || (allowLegacy ? process.env.SPACES_REGION : undefined);
  const key =
    process.env[keyKey] || (allowLegacy ? process.env.SPACES_KEY : undefined);
  const secret =
    process.env[secretKey] || (allowLegacy ? process.env.SPACES_SECRET : undefined);

  const missing = [];
  if (!region) missing.push(`${regionKey}${allowLegacy ? " (or SPACES_REGION)" : ""}`);
  if (!key) missing.push(`${keyKey}${allowLegacy ? " (or SPACES_KEY)" : ""}`);
  if (!secret) missing.push(`${secretKey}${allowLegacy ? " (or SPACES_SECRET)" : ""}`);

  if (missing.length > 0) {
    throw new Error(`Missing Spaces env vars for ${scope}: ${missing.join(", ")}`);
  }

  return { region, key, secret };
}

function resolveBucket(scope) {
  if (!SPACE_SCOPES.includes(scope)) {
    throw new Error(`Unknown Spaces scope "${scope}". Expected ${SPACE_SCOPES.join(", ")}`);
  }

  const allowLegacy = scope === "public";
  const bucketKey = getEnvVarName("BUCKET", scope);
  const bucket =
    process.env[bucketKey] || (allowLegacy ? process.env.SPACES_BUCKET : undefined);

  if (!bucket) {
    throw new Error(
      `Missing Spaces env vars for ${scope}: ${bucketKey}${allowLegacy ? " (or SPACES_BUCKET)" : ""}`,
    );
  }

  return bucket;
}

function getS3Client(scope) {
  const { region, key, secret } = resolveSpaceEnv(scope);

  return new S3Client({
    endpoint: `https://${region}.digitaloceanspaces.com`,
    region: "us-east-1",
    credentials: {
      accessKeyId: key,
      secretAccessKey: secret,
    },
  });
}

async function putObject({
  space = "public",
  bucket,
  key,
  body,
  contentType,
  cacheControl = "public, max-age=300",
  acl,
}) {
  const resolvedBucket = bucket || resolveBucket(space);
  const s3 = getS3Client(space);
  const resolvedAcl = acl != null ? acl : space === "public" ? "public-read" : undefined;

  const commandInput = {
    Bucket: resolvedBucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  };

  if (resolvedAcl) {
    commandInput.ACL = resolvedAcl;
  }

  await s3.send(new PutObjectCommand(commandInput));

  return {
    bucket: resolvedBucket,
    key,
    bytes: Buffer.byteLength(body, "utf8"),
  };
}

async function putJson({
  space = "public",
  bucket,
  key,
  json,
  cacheControl = "public, max-age=300",
}) {
  const body = JSON.stringify(json);
  return putObject({
    space,
    bucket,
    key,
    body,
    contentType: "application/json; charset=utf-8",
    cacheControl,
  });
}

async function putHtml({
  space = "public",
  bucket,
  key,
  html,
  cacheControl = "public, max-age=300",
}) {
  return putObject({
    space,
    bucket,
    key,
    body: html,
    contentType: "text/html; charset=utf-8",
    cacheControl,
  });
}

module.exports = { putJson, putHtml, putObject, resolveBucket };
