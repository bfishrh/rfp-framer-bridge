// OPTIONAL setup endpoint.
// The bridge is self-initializing (the first /api/publish creates the RFPs
// collection + fields automatically), so you normally don't need this.
// Use it only if you want to create the empty collection up front — e.g. to
// design your Framer pages before the first real RFP is published.
//
// Trigger it from a browser:  GET /api/setup?secret=<BRIDGE_SECRET>
// or as a POST with header     x-bridge-secret: <BRIDGE_SECRET>
//
// Verified against framer-api 0.1.12: createManagedCollection(name),
// collection.setFields(fields), publish() -> {deployment:{id}}, deploy(id).
import { getFramer, ensureRfpCollection, FIELDS, COLLECTION_NAME } from "../lib/framer.js";

export default async function handler(req, res) {
  const secret = req.headers["x-bridge-secret"] || req.query?.secret;
  if (secret !== process.env.BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const framer = await getFramer();
  try {
    await ensureRfpCollection(framer);
    const result = await framer.publish();
    await framer.deploy(result.deployment.id);

    return res.status(200).json({
      ok: true,
      collection: COLLECTION_NAME,
      fields: FIELDS.map((f) => f.id),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  } finally {
    await framer.disconnect();
  }
}
