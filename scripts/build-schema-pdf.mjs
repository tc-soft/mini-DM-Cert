import { mdToPdf } from "md-to-pdf";
import { DOC_PDF_PAIRS } from "./doc-pdf-pairs.mjs";

for (const { md, pdf } of DOC_PDF_PAIRS) {
  console.log(`Generating ${pdf} from ${md} ...`);
  await mdToPdf({ path: md }, { dest: pdf });
  console.log(`Done: ${pdf}`);
}
