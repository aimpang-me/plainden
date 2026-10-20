import type { ToolCopy } from "../../lib/contract/types";

export const copy = {
  headline: "Subtitle converter",
  steps: [
    "Add an SRT, WebVTT, or ASS file.",
    "Choose an output format and a timing shift in milliseconds.",
    "Press Convert and download the file. A free plan converts one file at a time.",
  ],
  faq: [
    {
      question: "Do the files leave this browser?",
      answer: "No. The converter reads the file on this device and builds the download here.",
    },
    {
      question: "How many files can a free plan convert?",
      answer: "One file at a time.",
    },
    {
      question: "How many files can a paid plan convert?",
      answer: "Up to 50 files in one run.",
    },
    {
      question: "Which subtitle formats are supported?",
      answer: "SRT, WebVTT, and ASS. Cue times and cue text carry across those formats.",
    },
    {
      question: "How does a timing shift work?",
      answer:
        "Type a whole number of milliseconds. A positive number delays every cue. A negative number moves cues earlier. A cue that would end at or before zero is removed. A cue that would start before zero starts at zero.",
    },
    {
      question: "Which text encodings can this page read?",
      answer: "UTF-8, UTF-16 when the file has a BOM, and Windows-1252. The download is UTF-8.",
    },
  ],
  longTail: [
    {
      slug: "vtt-to-srt",
      title: "Turn WebVTT into SRT",
      intro:
        "Use this page when a player wants SubRip and you have a WebVTT file. The converter writes SRT times with a comma before the milliseconds and numbers each cue from 1. Add the VTT file and press Convert.",
      preset: "to-srt",
      faq: [
        {
          question: "Does the SRT file keep line breaks?",
          answer: "Yes. A cue with two lines stays two lines.",
        },
      ],
    },
    {
      slug: "ass-to-srt",
      title: "Turn ASS subtitles into SRT",
      intro:
        "Use this page for an Advanced SubStation Alpha script. Dialogue lines become SRT cues. Times stay at the centisecond precision ASS already stored. Style definitions stay out of the SRT file.",
      preset: "to-srt",
      faq: [
        {
          question: "What happens to ASS style tags?",
          answer: "Tags such as bold codes stay in the cue text. The SRT file does not carry the style section.",
        },
      ],
    },
    {
      slug: "ass-to-vtt",
      title: "Turn ASS subtitles into WebVTT",
      intro:
        "Use this page when a web player needs WebVTT and the source is ASS. Each Dialogue line becomes one cue. The download starts with a WEBVTT header and uses dot-form timestamps.",
      preset: "to-vtt",
      faq: [
        {
          question: "Will the WebVTT file include a WEBVTT header?",
          answer: "Yes. The header is the first line of the download.",
        },
      ],
    },
    {
      slug: "shift-subtitle-timing",
      title: "Shift subtitle timing",
      intro:
        "Use this page when speech starts a second before the captions. The shift field begins at 1000 milliseconds. Raise it to delay the cues more, or type a negative number to move them earlier. The output format stays the same as the file you add.",
      preset: "delay-1000",
      faq: [
        {
          question: "What unit is the shift?",
          answer: "Milliseconds. 1000 milliseconds is one second.",
        },
      ],
    },
    {
      slug: "fix-subtitle-encoding",
      title: "Fix subtitle encoding",
      intro:
        "Use this page when a subtitle file shows the wrong characters. The converter reads UTF-8, UTF-16 with a byte order mark, and Windows-1252, then writes UTF-8. Cue times stay put unless you edit the shift. The output format matches the file you add.",
      preset: "fix-encoding",
      faq: [
        {
          question: "Does this page change the cue times?",
          answer: "No. The shift stays at 0 unless you edit it.",
        },
      ],
    },
  ],
} satisfies ToolCopy;
