#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const connectDB = require("./config/db");

(async () => {
  try {
    const filePath = path.join(__dirname, "content.json");
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      process.exit(1);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);

    const type = (data.type || "").toString().toLowerCase();

    // Map the type to a model file in ./models
    let modelPath;
    if (type === "movie") modelPath = "./models/movie";
    else if (type === "show") modelPath = "./models/show";
    else if (type === "episode") modelPath = "./models/episode";
    else modelPath = "./models/content";

    // Import the model. Models in this project use ES module `export default`.
    // Try CommonJS require first, then fall back to a dynamic ESM import if
    // the required value is not a constructor.
    const { pathToFileURL } = require("url");
    const modelRequirePath = path.join(__dirname, modelPath + ".js");

    let Model;
    try {
      // try CommonJS require (works if model file was transpiled)
      const required = require(modelPath);
      Model = required && required.default ? required.default : required;
    } catch (reqErr) {
      // ignore require error and try dynamic import below
    }

    // If require didn't return a usable constructor, try dynamic import (ESM)
    if (typeof Model !== "function") {
      try {
        const mod = await import(pathToFileURL(modelRequirePath).href);
        Model = mod && (mod.default || mod);
      } catch (impErr) {
        console.error(
          "Failed to load model for type",
          type,
          "via require or import:",
          impErr
        );
        process.exit(1);
      }
    }

    // Connect to the database
    await connectDB();

    // Normalize some common fields so Mongoose casting succeeds
    const normalizeNumber = (val) => {
      if (val == null) return val;
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        // extract digits and decimal point
        const numStr = val.replace(/[^0-9.\-]+/g, "");
        const num = numStr === "" ? NaN : Number(numStr);
        return Number.isFinite(num) ? num : val;
      }
      return val;
    };

    if (data.lengthMinutes)
      data.lengthMinutes = normalizeNumber(data.lengthMinutes);
    if (data.releaseYear) data.releaseYear = normalizeNumber(data.releaseYear);

    // Create and save the document
    const doc = new Model(data);
    const saved = await doc.save();

    console.log(`Saved ${Model.modelName || "document"} with id:`, saved._id);
    process.exit(0);
  } catch (err) {
    console.error("Error uploading content:", err);
    process.exit(1);
  }
})();
