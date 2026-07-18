import fs from "node:fs";
import path from "node:path";
import { buildOpenApiDocument } from "../contracts/api-contract";

const outputPath = path.resolve(__dirname, "../../openapi.json");
const document = buildOpenApiDocument();

fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
