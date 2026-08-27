import { execSync } from "node:child_process";
import { DOC_PDF_PAIRS } from "./doc-pdf-pairs.mjs";

const staged = execSync("git diff --cached --name-only", { encoding: "utf8" }).split("\n").filter(Boolean);

const stale = DOC_PDF_PAIRS.filter(({ md, pdf }) => staged.includes(md) && !staged.includes(pdf));

if (stale.length > 0) {
  console.error("Zmieniłeś dokumentację schematu, ale nie dołączyłeś odświeżonego PDF-a do commita:\n");
  for (const { md, pdf } of stale) {
    console.error(`  ${md} -> ${pdf}`);
  }
  console.error("\nUruchom `npm run docs:pdf`, dodaj wygenerowany PDF (`git add`) i spróbuj ponownie.");
  process.exit(1);
}
