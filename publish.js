// PUBLISH endpoint — called by the Make.com "Publish" scenario.
//
// Make sends a JSON body with the public RFP fields (see README). This:
//   1. upserts a CMS item in the "RFPs" collection (create or update),
//   2. publishes + deploys the Framer site,
//   3. returns the public URL of the RFP page so Make can write it back to Smartsheet.
//
// To UNPUBLISH (RFP cancelled / Publish to Web unchecked), send { "unpublish": true }
// along with the rfpNumber and the item is removed.
//
// Auth: header  x-bridge-secret: <BRIDGE_SECRET>
import {
  getFramer,
  ensureRfpCollection,
  toCollectionItem,
  slugify,
} from "../lib/framer.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (req.headers["x-bridge-secret"] !== process.env.BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = req.body || {};
  const rfpNumber = String(payload.rfpNumber || "").trim();
  if (!rfpNumber) return res.status(400).json({ error: "rfpNumber is required" });

  const framer = await getFramer();
  try {
    // Self-initializing: creates the RFPs collection + fields on first call.
    const collection = await ensureRfpCollection(framer);

    const slug = slugify(rfpNumber);
    const itemId = `rfp-${slug}`;

    if (payload.unpublish === true) {
      await collection.removeItems([itemId]);
    } else {
      const item = toCollectionItem(payload);
      // addItems upserts: matching id updates, new id creates.
      await collection.addItems([item]);
    }

    const result = await framer.publish();
    await framer.deploy(result.deployment.id);

    // Public RFP detail page URL. Adjust the path prefix to match the page
    // route you create in Framer (e.g. /rfp/[slug]).
    const baseUrl = process.env.SITE_BASE_URL || "https://www.reliancehospitality.com";
    const publicUrl = payload.unpublish ? "" : `${baseUrl}/rfp/${slug}`;

    return res.status(200).json({
      ok: true,
      rfpNumber,
      action: payload.unpublish ? "unpublished" : "published",
      publicUrl,
      deploymentId: result.deployment.id,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  } finally {
    await framer.disconnect();
  }
}
