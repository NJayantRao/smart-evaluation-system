const mongoose = require("mongoose");

let bucket;

const initBucket = () => {
  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
};

// Handle both cases: this module loading before mongoose.connect() has run
// (the normal path — routes are required before server.js calls connect),
// and, defensively, the connection already being open (e.g. hot reloads).
if (mongoose.connection.readyState === 1) {
  initBucket();
} else {
  mongoose.connection.once("open", initBucket);
}

module.exports = () => bucket;
