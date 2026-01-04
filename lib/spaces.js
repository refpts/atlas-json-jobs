const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

function getS3Client() {
  const { SPACES_REGION, SPACES_KEY, SPACES_SECRET } = process.env;

  if (!SPACES_REGION || !SPACES_KEY || !SPACES_SECRET) {
    throw new Error("Missing Spaces env vars: SPACES_REGION, SPACES_KEY, SPACES_SECRET");
  }

  return new S3Client({
    endpoint: `https://${SPACES_REGION}.digitaloceanspaces.com`,
    region: "us-east-1",
    credentials: {
      accessKeyId: SPACES_KEY,
      secretAccessKey: SPACES_SECRET,
    },
  });
}

async function putJson({ bucket, key, json, cacheControl = "public, max-age=300" }) {
  const s3 = getS3Client();
  const body = JSON.stringify(json);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json; charset=utf-8",
      CacheControl: cacheControl,
      ACL: "public-read",
    })
  );

  return { bucket, key, bytes: Buffer.byteLength(body, "utf8") };
}

module.exports = { putJson };