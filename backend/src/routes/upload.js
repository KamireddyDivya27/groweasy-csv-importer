const express = require("express");
const multer = require("multer");
const { parseCsv } = require("../services/csvParser");
const { extractCrmRecords } = require("../services/aiExtractor");

const router = express.Router();

const maxBytes = parseInt(process.env.MAX_UPLOAD_BYTES || "5242880", 10);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes },
  fileFilter: (req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      return cb(new Error("Only .csv files are supported."));
    }
    cb(null, true);
  },
});

/**
 * POST /api/csv/preview
 * Parses the CSV and returns headers + rows for the frontend preview table.
 * No AI processing happens here.
 */
router.post("/preview", upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Field name must be 'file'." });
    }
    const csvText = req.file.buffer.toString("utf-8");
    const { headers, rows } = parseCsv(csvText);
    res.json({ headers, rows, totalRows: rows.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/csv/import
 * Accepts the CSV again (or headers+rows already parsed client-side) and runs
 * AI extraction in batches, returning structured CRM JSON.
 *
 * Body: multipart/form-data with 'file', OR JSON { headers, rows }.
 */
router.post("/import", upload.single("file"), async (req, res, next) => {
  try {
    let headers, rows;

    if (req.file) {
      const csvText = req.file.buffer.toString("utf-8");
      ({ headers, rows } = parseCsv(csvText));
    } else if (req.body && req.body.rows) {
      headers = req.body.headers || Object.keys(req.body.rows[0] || {});
      rows = req.body.rows;
    } else {
      return res.status(400).json({
        error: "Provide a CSV file (field 'file') or JSON { headers, rows }.",
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows to import." });
    }

    const result = await extractCrmRecords(headers, rows);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
