The image tool is one record keyed by compress, resize, convert, heic, and webp. Each row owns the slugs it answers, the preset parser, the form fields, and the transform. `runImage` is the only function that produces files. `config.slugs`, `config.seoPages`, and `copy.longTail` are read from that record in `opOrder`.

`resize-image-to-20kb` sits on the compress row with preset `20kb` and a target of 20480 bytes. The resize row does not list that slug. A byte target stays on the quality search, and pixel resize stays on the resize row.

Compress always writes JPEG. Quality is the continuous knob that can land inside 10% of a byte target. The copy says the tool aims within 10% and does not promise an exact byte count. A miss still returns the closest file. The note states the actual size and the target.

The HEIC row loads `./heic` with a dynamic import inside that row's transform. `engine.ts` does not statically import it. `heic.ts` then loads `heic-to` on that submit. The other rows do not mention that package.

`decideLimit` is imported from `run.ts`. `config.ts` imports the operation table only. A static import of the limit helper from the table file breaks registry generation, because Node then loads modules whose own imports do not resolve.

`fileSize` is checked on each file's own `size`. The gate does not add the batch together. Ten files of 10 MB pass on the free plan. One file of 10 MB plus 1 byte fails before `read` runs.
