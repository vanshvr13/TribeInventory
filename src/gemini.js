import { ai } from "./firebaseClient";
import { getGenerativeModel, Schema } from "firebase/ai";
import { resizePhoto } from "./photoStorage";

const CATEGORY_NONE = "__NONE__";

function dataUrlToInlinePart(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*);base64/)[1];
  return { inlineData: { data, mimeType } };
}

export async function identifyItemFromPhotos(photos, folderPaths) {
  const model = getGenerativeModel(ai, {
    model: "gemini-3.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: Schema.object({
        properties: {
          name: Schema.string(),
          brand: Schema.string(),
          category: Schema.enumString({ enum: [...folderPaths, CATEGORY_NONE] }),
          expiryRaw: Schema.string(),
          expiryIso: Schema.string(),
        },
      }),
    },
  });

  const hasExpiryPhoto = photos.length > 1;
  const prompt = `You are extracting structured inventory data from photos of a grocery product label, for a household inventory app. The label may be in Romanian, English, or another European language — read it in its original language, do not translate it.

From the first image (the product label), extract:
- name: the product's name as printed (combine a brand banner and a product-type line if the name is split across them)
- brand: the brand or manufacturer name, if shown; empty string if not shown
- category: pick the single best-fitting option from the provided list of existing folders. If nothing fits well, return "${CATEGORY_NONE}" rather than guessing.

${
  hasExpiryPhoto
    ? `A second image is provided — a close-up of the expiry / best-before date. Extract:
- expiryRaw: the date text exactly as printed, including nearby label words
- expiryIso: your best conversion to ISO format YYYY-MM-DD (European labels are usually DD.MM.YY). Leave this empty if you're not confident in the conversion, but still fill expiryRaw with what you can see.`
    : `No second image was provided — leave expiryRaw and expiryIso as empty strings.`
}

Return only the structured fields, no extra commentary.`;

  const compressed = await Promise.all(photos.slice(0, 2).map((p) => resizePhoto(p, 768, 0.7)));
  const imageParts = compressed.map(dataUrlToInlinePart);
  const result = await model.generateContent([prompt, ...imageParts]);
  const parsed = JSON.parse(result.response.text());

  return {
    name: parsed.name || "",
    brand: parsed.brand || "",
    category: parsed.category === CATEGORY_NONE ? "" : parsed.category,
    expiryIso: parsed.expiryIso || "",
  };
}
