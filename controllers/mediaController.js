import media from "../config/media.js";

// Upload endpoint that accepts either:
// - multipart file available at req.file (e.g. multer), or
// - base64 payload in req.body.base64 with req.body.name
const uploadMedia = async (req, res) => {
  try {
    const file = req.file;

    if (!file && (!req.body || !req.body.base64 || !req.body.name)) {
      return res
        .status(400)
        .json({
          error:
            "No file uploaded. Provide multipart req.file or base64 body with name.",
        });
    }

    // Delegate actual upload work to helpers in config/media.js so other scripts can reuse them
    if (file) {
      // Expect multer memory storage (file.buffer)
      if (!file.buffer)
        return res
          .status(400)
          .json({
            error: "Multipart upload requires memory storage (file.buffer)",
          });
      const result = await media.uploadFromMultipart(file);
      return res.json({ success: true, key: result.key, url: result.url });
    }

    // base64 path
    const { base64, name, type } = req.body;
    if (!base64 || !name)
      return res.status(400).json({ error: "Missing base64 data or name" });
    const result = await media.uploadFromBase64(base64, name, type);
    return res.json({ success: true, key: result.key, url: result.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "upload failed" });
  }
};

// Returns a signed URL which redirects the client to S3
const getMedia = async (req, res) => {
  try {
    const key = req.params.key || req.query.key;
    if (!key) return res.status(400).send("Missing key");
    // delegate to helper
    const url = await media.getSignedUrlForGet(key);
    return res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || "error");
  }
};

const listMedia = async (req, res) => {
  try {
    const prefix = req.query.prefix || "";
    const items = await media.listObjects(prefix);
    res.json({ success: true, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const key = req.params.key || req.body.key;
    if (!key) return res.status(400).json({ error: "Missing key" });
    await media.deleteObject(key);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
export { uploadMedia, getMedia, listMedia, deleteMedia };

export default {
  uploadMedia,
  getMedia,
  listMedia,
  deleteMedia,
};
