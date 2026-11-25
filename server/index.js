
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const GEMINI_MODEL = "gemini-3.5-flash-lite";

const CPCB_RESOURCE_ID =
  "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header (e.g. API tools).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "1mb" }));

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function parseReading(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRecord(record) {
  return {
    country: record.country ?? null,
    state: record.state ?? null,
    city: record.city ?? null,
    station: record.station ?? "Unknown station",
    latitude: parseReading(record.latitude),
    longitude: parseReading(record.longitude),
    pollutant: record.pollutant_id ?? null,
    average: parseReading(record.avg_value),
    minimum: parseReading(record.min_value),
    maximum: parseReading(record.max_value),
    lastUpdated: record.last_update ?? null,
  };
}

async function fetchCPCBRecords(city = "Pimpri-Chinchwad") {
  if (!DATA_GOV_API_KEY) {
    throw new Error("DATA_GOV_API_KEY is not configured");
  }

  const url = new URL(
    `https://api.data.gov.in/resource/${CPCB_RESOURCE_ID}`
  );

  url.searchParams.set("api-key", DATA_GOV_API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("offset", "0");
  url.searchParams.set("filters[state]", "Maharashtra");
  url.searchParams.set("filters[city]", city);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`CPCB API returned HTTP ${response.status}`);
  }

  const result = await response.json();

  if (!Array.isArray(result.records)) {
    throw new Error("CPCB API returned an invalid records response");
  }

  return result.records.map(normalizeRecord);
}

function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

// --------------------------------------------------
// ROOT ROUTE
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    application: "BreatheWise AI",
    message: "Urban Air Quality Assistant backend is running.",
  });
});

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    application: "BreatheWise AI",
    backend: "Running",
    gemini: ai ? "Configured" : "Missing API key",
    cpcb: DATA_GOV_API_KEY ? "Configured" : "Missing API key",
  });
});

// --------------------------------------------------
// CPCB AIR QUALITY DATA
// --------------------------------------------------

app.get("/api/air-quality", async (req, res) => {
  try {
    const city = cleanText(
      req.query.city || "Pimpri-Chinchwad",
      100
    );

    const records = await fetchCPCBRecords(city);

    res.json({
      success: true,
      source: "CPCB / data.gov.in",
      city,
      count: records.length,
      records,
    });
  } catch (error) {
   console.error("Air quality API error:", error);

    res.status(502).json({
      success: false,
      message: "Unable to retrieve CPCB air-quality data.",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// NATIONAL AQI STATUS
// --------------------------------------------------

app.get("/api/aqi", (req, res) => {
  res.json({
    success: true,
    available: false,
    aqi: null,
    category: "Awaiting validated history",
    message:
      "Official National AQI is unavailable until sufficient valid historical pollutant observations are available.",
  });
});

// --------------------------------------------------
// GEMINI AI ASSISTANT
// --------------------------------------------------

app.post("/api/assistant", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        success: false,
        message: "Gemini API key is not configured on the server.",
      });
    }

    const question = cleanText(req.body.question, 2000);
    const location = cleanText(
      req.body.location || "Pimpri-Chinchwad",
      150
    );

    const family = req.body.family || {};

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Please provide a question.",
      });
    }

    // Fetch readings on the backend rather than trusting
    // measurements supplied by the browser.
    let stationRecords = [];
    let dataStatus = "unavailable";

    try {
      const records = await fetchCPCBRecords("Pimpri-Chinchwad");

      const requestedStation =
        typeof req.body.station === "string"
          ? req.body.station
          : req.body.station?.station;

      if (requestedStation) {
        stationRecords = records.filter(
          (record) =>
            record.station.toLowerCase() ===
            String(requestedStation).toLowerCase()
        );
      }

      // If no station was selected or it did not match,
      // use the available PCMC records without pretending
      // they belong to the selected station.
      if (!stationRecords.length && !requestedStation) {
        stationRecords = records;
      }

      if (stationRecords.length) {
        dataStatus = "available";
      }
    } catch (error) {
      console.error("CPCB data unavailable for assistant:", error.message);
    }

    const familyDetails =
      typeof family === "object"
        ? JSON.stringify(family).slice(0, 1500)
        : cleanText(String(family), 1500);

    const readingsContext =
      dataStatus === "available"
        ? JSON.stringify(stationRecords, null, 2)
        : "No validated live CPCB station readings are currently available.";

    const prompt = `
You are BreatheWise AI, an urban air-quality information assistant.

USER LOCATION:
${location}

USER QUESTION:
${question}

FAMILY CONTEXT:
${familyDetails || "No additional family details provided."}

CPCB DATA STATUS:
${dataStatus}

CPCB STATION OBSERVATIONS:
${readingsContext}

INSTRUCTIONS:
1. Answer the user's question clearly and practically.
2. Use the supplied CPCB observations when relevant.
3. Identify pollutant names and station information accurately.
4. Treat these observations as reported pollutant measurements, not automatically as the official National AQI.
5. Do not invent AQI values, readings, timestamps, medical facts, or station measurements.
6. If readings are unavailable, clearly say so and provide general air-quality guidance.
7. Give practical precautions for children, older adults, and people sensitive to air pollution when relevant.
8. Do not diagnose medical conditions.
9. Keep the answer understandable to an ordinary resident.
`;

    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const answer = result.text;

    if (!answer) {
      throw new Error("Gemini returned an empty response");
    }

    res.json({
      success: true,
      answer,
      reply: answer,
      model: GEMINI_MODEL,
      dataStatus,
      source: dataStatus === "available"
        ? "CPCB / data.gov.in"
        : "No live CPCB readings available",
    });
  } catch (error) {
    console.error("Gemini assistant error:", error);

    res.status(500).json({
      success: false,
      message: "The AI assistant could not process your request.",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log("-------------------------------------");
  console.log("BreatheWise AI backend is running");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Gemini: ${ai ? "Configured" : "Not configured"}`);
  console.log(
    `CPCB: ${DATA_GOV_API_KEY ? "Configured" : "Not configured"}`
  );
  console.log("-------------------------------------");
});
