import type { ToolCopy } from "../../lib/contract/types";
import type { PresetKey } from "./presets";

function tail(
  preset: PresetKey,
  page: { slug: string; title: string; intro: string; question: string; answer: string },
) {
  return {
    slug: page.slug,
    title: page.title,
    intro: page.intro,
    preset,
    faq: [{ question: page.question, answer: page.answer }],
  };
}

export const copy = {
  headline: "QR code generator",
  steps: [
    "Pick a link, a note, a Wi-Fi network, or a contact.",
    "Download a PNG or an SVG. The file stays on this device and never expires.",
    "A paid plan can publish a redirect that counts each scan.",
  ],
  faq: [
    {
      question: "Does a static QR code expire?",
      answer: "No. A PNG or SVG you download keeps working with no account and no renewal.",
    },
    {
      question: "Which payloads can I encode?",
      answer: "A link, plain text, a Wi-Fi network, or a contact card.",
    },
    {
      question: "Which files can I download?",
      answer: "PNG and SVG. Both are created in your browser.",
    },
    {
      question: "What is a dynamic QR code?",
      answer: "A dynamic code points at a plainden redirect. You can change the destination later, and each visit adds to the scan count.",
    },
    {
      question: "How many dynamic codes can I save?",
      answer: "The free plan saves none. A paid plan saves 20.",
    },
    {
      question: "Can I put a logo in the center?",
      answer: "A paid dynamic code can carry a PNG, JPEG, or WebP logo. The logo is drawn into the SVG.",
    },
  ],
  longTail: [
    tail("link", {
      slug: "qr-code-generator-no-expiration",
      title: "QR code that never expires",
      intro:
        "A static link code is just a picture. Download the PNG or SVG and it keeps opening the same address with no account and no renewal date.",
      question: "What makes this code expire?",
      answer: "Nothing on this page. The file does not call plainden again.",
    }),
    tail("wifi", {
      slug: "wifi-qr-code",
      title: "Wi-Fi QR code",
      intro:
        "Guests can join a network by scanning a code instead of typing the password. The network name, security, and password stay inside the picture.",
      question: "Which security types work?",
      answer: "WPA, WEP, and a network with no password.",
    }),
    tail("card", {
      slug: "vcard-qr-code",
      title: "Contact card QR code",
      intro:
        "Put a name, phone, email, and organization into a vCard. A phone can save the contact from the scan.",
      question: "Is the contact uploaded?",
      answer: "No. The vCard is written into the image on this device.",
    }),
    tail("note", {
      slug: "text-qr-code",
      title: "Text QR code",
      intro:
        "Encode a short note that a scanner shows as text. Use it for a desk label, a serial, or a message that is not a link.",
      question: "Is there a length limit?",
      answer: "Yes. The note must be 800 characters or fewer.",
    }),
    tail("dynamic", {
      slug: "dynamic-qr-code",
      title: "Dynamic QR code with scan counts",
      intro:
        "Publish a redirect when you need to change the destination later. The printed code stays the same, and plainden counts each scan.",
      question: "Does a lapsed plan break old codes?",
      answer: "No. Existing redirects keep working. Creating or editing a code needs a paid plan.",
    }),
  ],
} satisfies ToolCopy;
