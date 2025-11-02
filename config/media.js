import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 helper module. Uses environment variables:
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
const REGION = process.env.AWS_REGION || "eu-north-1";
const BUCKET = process.env.S3_BUCKET_NAME;

const ENDPOINT = process.env.S3_ENDPOINT || undefined;
const FORCE_PATH_STYLE = (process.env.S3_FORCE_PATH_STYLE || "false") === "true";

if (!BUCKET) {
  console.warn(
    "S3_BUCKET_NAME not set. S3 helpers will fail until configured."
  );
}

const s3Client = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: FORCE_PATH_STYLE,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
    : undefined,
});

if (ENDPOINT) {
  console.info(`S3 client configured with custom endpoint=${ENDPOINT} forcePathStyle=${FORCE_PATH_STYLE}`);
}

function _makeKey(originalName) {
  if (!originalName) originalName = "file";
  return `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

async function uploadBuffer(buffer, key, contentType) {
  if (!BUCKET) throw new Error("S3 bucket not configured");
  const finalKey = key || _makeKey("upload");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: finalKey,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(cmd);
  return finalKey;
}

// Higher-level helper: accept a multer-style file object ({ buffer, originalname, mimetype })
async function uploadFromMultipart(file, key = null) {
  if (!file || !file.buffer) throw new Error("Invalid multipart file");

  const suggestedKey = _makeKey(file.originalname || "upload");
  const chosenKey = key || suggestedKey;
  const finalKey = await uploadBuffer(
    file.buffer,
    chosenKey,
    file.mimetype || "application/octet-stream"
  );
  const url = await getSignedUrlForGet(finalKey);
  return { key: finalKey, url };
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
  const suggestedKey = _makeKey(name);
  const finalKey = await uploadBuffer(buffer, suggestedKey, mime);
  const url = await getSignedUrlForGet(finalKey);
  return { key: finalKey, url };
}

async function getSignedUrlForGet(key, expiresInSeconds = 900) {
  if (!BUCKET) throw new Error("S3 bucket not configured");
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(s3Client, cmd, { expiresIn: expiresInSeconds });
}

function getObjectUrl(key) {
  if (!key) return null;
  // If custom endpoint is provided (S3-compatible), use path style under endpoint
  if (ENDPOINT) {
    return `${ENDPOINT.replace(/\/$/, "")}/${BUCKET}/${encodeURIComponent(key)}`;
  }
  // If forcePathStyle is requested, construct path-style AWS url
  if (FORCE_PATH_STYLE) {
    const regionPart = REGION ? `${REGION}.` : "";
    return `https://s3.${regionPart}amazonaws.com/${BUCKET}/${encodeURIComponent(key)}`;
  }
  // Default virtual-hosted style URL (works for most AWS buckets)
  if (REGION === "us-east-1") {
    return `https://${BUCKET}.s3.amazonaws.com/${encodeURIComponent(key)}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`;
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

export {
  s3Client,
  uploadBuffer,
  uploadFromMultipart,
  uploadFromBase64,
  getSignedUrlForGet,
  getObjectUrl,
  deleteObject,
  listObjects,
};

export default {
  s3Client,
  uploadBuffer,
  uploadFromMultipart,
  uploadFromBase64,
  getSignedUrlForGet,
  deleteObject,
  listObjects,
};
