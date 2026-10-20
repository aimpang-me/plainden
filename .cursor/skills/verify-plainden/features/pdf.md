# PDF tools

The compress long-tail page says the result is up to 4 MB. Merge joins two PDFs in the browser.

## Sub-features

- `pdf-up-to` shows the 4 MB page does not promise a 4 MB file.
- `pdf-merge` turns two one-page PDFs into one two-page file.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/compress-pdf-to-4mb`.
- Open `http://127.0.0.1:3100/merge-pdf` and add PDF files.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Up to 4 MB.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive pdf`. The drive opens `/compress-pdf-to-4mb` and requires the text `up to 4 MB` and `does not promise a 4 MB file`.
- **Merge.** The drive then opens `/merge-pdf`, adds two one-page PDFs, and clicks `Merge PDFs`. The status is `Merged 2 files into 2 pages.` and a link downloads `merged.pdf`.
- **Proof.** The drive writes `evidence/pdf/actions.txt`, `evidence/pdf/aria.txt`, and `evidence/pdf/page.png`.

## Gotchas

- The free plan still allows this merge. The daily cap of 5 is a later click and is not this drive.
- Split, compress, and JPG to PDF share the same engine. This drive proves merge plus the 4 MB wording.
