The converter keeps one document shape. A cue is a start time, an end time, and text. Parse turns SRT, WebVTT, or ASS into that list. Shift edits the list. Serialize writes the chosen format.

The other shape was a format-preserving tree with VTT notes and ASS styles. That tree would make the UI know each format's blocks. The plan asks for cue round trips, a timing shift, and an encoding fix, so the extra blocks do not earn a place. Style sections are dropped. Override tags inside a cue stay in the text.

`convertSubtitle` is the call the page and the tests use. It decodes bytes, parses, shifts, and writes one string. `gateBatch` applies `batchCount` from `tools/subtitles/config.ts`.
