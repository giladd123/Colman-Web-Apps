import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListBucketsCommand
} from "@aws-sdk/client-s3";
import sharp from "sharp";

// S3 helper module. Uses environment variables:
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
const necessaryEnvVars = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "S3_BUCKET_NAME",
];

let non_defined_vars = necessaryEnvVars.filter((v => !process.env[v]));

if (non_defined_vars.length > 0) {
  console.warn(
    `The following environment variables are not set: ${non_defined_vars.join(", ")}. Exiting...`
  );
  process.exit(1);
}


const [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, REGION, BUCKET] = necessaryEnvVars.map(v => process.env[v])

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  }
});

async function checkS3Connection() {
  try {
    await s3Client.send(new ListBucketsCommand({}));
    console.log("✅ Connected to S3!");
  } catch (err) {
    console.error("❌ Failed to connect to S3:", err.message);
    process.exit(1);
  }
}

await checkS3Connection()


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

async function uploadFromMultipart(file, key = null) {
  if (!file || !file.buffer) throw new Error("Invalid multipart file");

  const suggestedKey = _makeKey(file.originalname || "upload");
  const chosenKey = key || suggestedKey;
  let buffer = file.buffer;
  let contentType = file.mimetype || "application/octet-stream";
  try {
    if (contentType && contentType.startsWith("image/")) {
      // Normalize to square and consistent size for coherence
      const SIZE = 320; // px
      buffer = await sharp(file.buffer)
        .rotate() // respect EXIF orientation
        .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
        .toBuffer(); // keep original format by default
      // contentType remains original (jpeg/png/webp)
    }
  } catch (err) {
    console.warn("Image processing failed, uploading original buffer:", err.message);
  }
  const finalKey = await uploadBuffer(
    buffer,
    chosenKey,
    contentType
  );
  const url = getObjectUrl(finalKey);
  return { key: finalKey, url };
}


function getObjectUrl(key) {
  if (!key) return null;
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
  getObjectUrl,
  deleteObject,
  listObjects,
};

export default {
  s3Client,
  uploadBuffer,
  uploadFromMultipart,
  deleteObject,
  listObjects,
  getObjectUrl
};
