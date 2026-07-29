const getBucket = require("../config/gridfs");

exports.uploadFile = (file) =>
  new Promise((resolve, reject) => {
    const bucket = getBucket();

    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
    });

    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    // Write the buffer directly rather than via Readable.from(): if this
    // ever receives a plain Uint8Array instead of a real Buffer,
    // Readable.from() would iterate it byte-by-byte instead of streaming
    // it as one chunk. Buffer.from() is a no-op if it's already a Buffer.
    uploadStream.end(Buffer.from(file.buffer));
  });

exports.downloadFile = (id) =>
  new Promise((resolve, reject) => {
    const bucket = getBucket();

    const chunks = [];

    bucket
      .openDownloadStream(id)
      .on("data", (chunk) => chunks.push(chunk))
      .on("error", reject)
      .on("end", () => resolve(Buffer.concat(chunks)));
  });

// Returns a raw readable stream for the file so callers can pipe it straight
// to an HTTP response instead of buffering the whole file in memory.
exports.openDownloadStream = (id) => {
  const bucket = getBucket();
  return bucket.openDownloadStream(id);
};

// Fetches the GridFS file document (filename, contentType, length, etc.)
// without downloading its contents. Returns null if no such file exists.
exports.getFileMetadata = async (id) => {
  const bucket = getBucket();
  const files = await bucket.find({ _id: id }).toArray();
  return files[0] || null;
};

exports.deleteFile = (id) =>
  new Promise((resolve, reject) => {
    const bucket = getBucket();
    bucket.delete(id, (err) => (err ? reject(err) : resolve()));
  });
