// Shared helpers for talking to the Framer Server API.
// Framer Server API docs: https://www.framer.com/developers/server-api-introduction
import { connect } from "framer-api";

export const COLLECTION_NAME = "RFPs";

// Stable field IDs. Using fixed IDs (not auto-generated) means renaming a field
// in Framer later won't break the sync. Max 64 chars each.
export const FIELDS = [
  { id: "rfpNumber", name: "RFP Number", type: "string" },
  { id: "title", name: "Title", type: "string" },
  { id: "summary", name: "Public Summary", type: "formattedText" },
  { id: "scopeOfWork", name: "Scope of Work", type: "string" },
  { id: "location", name: "Location", type: "string" },
  { id: "brand", name: "Brand / Flag", type: "string" },
  { id: "budgetRange", name: "Budget Range", type: "string" },
  { id: "deadline", name: "Submission Deadline", type: "date" },
  { id: "status", name: "RFP Status", type: "string" },
];

// Connect to the project. projectUrl + FRAMER_API_KEY come from env.
export async function getFramer() {
  const projectUrl = process.env.FRAMER_PROJECT_URL;
  const apiKey = process.env.FRAMER_API_KEY;
  if (!projectUrl || !apiKey) {
    throw new Error("Missing FRAMER_PROJECT_URL or FRAMER_API_KEY env vars.");
  }
  return connect(projectUrl, apiKey);
}

// Find the RFPs MANAGED collection by name. Returns null if it doesn't exist yet.
// Writing items (setFields/addItems) is only allowed on managed collections.
export async function findRfpCollection(framer) {
  const collections = await framer.getManagedCollections();
  for (const c of collections) {
    const name = typeof c.getName === "function" ? await c.getName() : c.name;
    if (name === COLLECTION_NAME) return c;
  }
  return null;
}

// Find the RFPs collection, creating it (with fields) if it doesn't exist yet.
export async function ensureRfpCollection(framer) {
  let collection = await findRfpCollection(framer);
  if (!collection) {
    collection = await framer.createManagedCollection(COLLECTION_NAME);
    await collection.setFields(FIELDS);
  }
  return collection;
}

// Build a Framer-safe slug from the RFP number, e.g. "2026-215".
export function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Convert a Make/Smartsheet payload into a Framer CMS item.
// The Server API requires each field value to be a TYPED entry:
//   string/formattedText -> { type, value }, date -> { type, value: ISO|null }.
export function toCollectionItem(payload) {
  const rfpNumber = String(payload.rfpNumber || "").trim();
  if (!rfpNumber) throw new Error("payload.rfpNumber is required");

  const raw = {
    rfpNumber: rfpNumber,
    title: payload.title,
    summary: payload.summary,
    scopeOfWork: payload.scopeOfWork,
    location: payload.location,
    brand: payload.brand,
    budgetRange: payload.budgetRange,
    deadline: payload.deadline,
    status: payload.status,
  };

  const fieldData = {};
  for (const f of FIELDS) {
    const v = raw[f.id];
    if (f.type === "date") {
      fieldData[f.id] = { type: "date", value: v ? new Date(v).toISOString() : null };
    } else if (f.type === "formattedText") {
      fieldData[f.id] = { type: "formattedText", value: v ? String(v) : "", contentType: "html" };
    } else {
      fieldData[f.id] = { type: "string", value: v == null ? "" : String(v) };
    }
  }

  return {
    id: `rfp-${slugify(rfpNumber)}`,
    slug: slugify(rfpNumber),
    draft: false,
    fieldData,
  };
}
