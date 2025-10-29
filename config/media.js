const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// S3 helper module. Uses environment variables:
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET_NAME;

if (!BUCKET) {
  console.warn(
    "S3_BUCKET_NAME not set. S3 helpers will fail until configured."
  );
}

const s3Client = new S3Client({
  region: REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

function _makeKey(originalName) {
  if (!originalName) originalName = "file";
  return `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

async function uploadBuffer(buffer, key, contentType) {
  if (!BUCKET) throw new Error("S3 bucket not configured");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(cmd);
  return key;
}

// Higher-level helper: accept a multer-style file object ({ buffer, originalname, mimetype })
async function uploadFromMultipart(file) {
  if (!file || !file.buffer) throw new Error("Invalid multipart file");
  const key = _makeKey(file.originalname || "upload");
  await uploadBuffer(
    file.buffer,
    key,
    file.mimetype || "application/octet-stream"
  );
  const url = await getSignedUrlForGet(key);
  return { key, url };
}

// Higher-level helper: accept base64 string (data URL or raw base64) and a file name
async function uploadFromBase64(base64str, name, type) {
  if (!base64str || !name) throw new Error("Missing base64 data or name");
  const matches = (base64str || "").match(/^data:(.+);base64,(.+)$/);
  let buffer;
  let mime = "application/octet-stream";
  if (matches) {
    mime = matches[1];
    buffer = Buffer.from(matches[2], "base64");
  } else {
    buffer = Buffer.from(base64str, "base64");
    if (type) mime = type;
  }
  const key = _makeKey(name);
  await uploadBuffer(buffer, key, mime);
  const url = await getSignedUrlForGet(key);
  return { key, url };
}

async function getSignedUrlForGet(key, expiresInSeconds = 900) {
  if (!BUCKET) throw new Error("S3 bucket not configured");
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(s3Client, cmd, { expiresIn: expiresInSeconds });
}

async function deleteObject(key) {
  if (!BUCKET) throw new Error("S3 bucket not configured");
  const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3Client.send(cmd);
}

async function listObjects(prefix = "") {
  if (!BUCKET) throw new Error("S3 bucket not configured");
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix });
  const res = await s3Client.send(cmd);
  return res.Contents || [];
}

module.exports = {
  s3Client,
  uploadBuffer,
  uploadFromMultipart,
  uploadFromBase64,
  getSignedUrlForGet,
  deleteObject,
  listObjects,
};
