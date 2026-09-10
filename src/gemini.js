import { ai } from "./firebaseClient";
import { getGenerativeModel, Schema } from "firebase/ai";
import { resizePhoto } from "./photoStorage";

const CATEGORY_NONE = "__NONE__";
const LANGUAGE_NAMES = { en: "English", ro: "Romanian" };

function dataUrlToInlinePart(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*);base64/)[1];
  return { inlineData: { data, mimeType } };
}

export async function identifyItemFromPhotos(photos, folderPaths, { exampleNames = [], language = "en" } = {}) {
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
  const languageName = LANGUAGE_NAMES[language] || "English";
  const prompt = `You are extracting structured inventory data from photos of a household product, for a home inventory app. The label may be in Romanian, English, or another European language.

From the first image (the product), extract:
- name: a short, practical name in ${languageName} — what a person would write on a shopping list. For everyday household goods (water, sugar, flour, oil, milk, cleaning supplies, ...) use the GENERIC product type plus size, never the brand or marketing name. Examples: a bottle of "Aqua Carpatica 2L" is named "Water 2L", a bag of "Coronița Zahăr 1kg" is "Sugar 1kg". Only keep a specific product name when the generic type would be ambiguous or lose important information (e.g. "Coca-Cola Zero 1.5L", a specific medicine, a distinct flavor that matters).
- brand: the brand or manufacturer name, if shown; empty string if not shown. The brand always goes here, never in the name.
- category: pick the single best-fitting option from the provided list of existing folders. If nothing fits well, return "${CATEGORY_NONE}" rather than guessing.
${
  exampleNames.length
    ? `\nItems already in this inventory are named like: ${exampleNames.slice(0, 12).map((n) => `"${n}"`).join(", ")}. Match this naming style and language for consistency.\n`
    : ""
}
${
  hasExpiryPhoto
    ? `A second image is provided — a close-up of the expiry / best-before date. Extract:
- expiryRaw: the date text exactly as printed, including nearby label words
- expiryIso: your best conversion to ISO format YYYY-MM-DD (European labels are usually DD.MM.YY). Leave this empty if you're not confident in the conversion, but still fill expiryRaw with what you can see.`
    : `No second image was provided — leave expiryRaw and expiryIso as empty strings.`
}

Return only the structured fields, no extra commentary.`;

  // ≤768px in both dimensions = one 258-token tile; quality 0.6 keeps the upload small without hurting label legibility
  const compressed = await Promise.all(photos.slice(0, 2).map((p) => resizePhoto(p, 768, 0.6)));
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
