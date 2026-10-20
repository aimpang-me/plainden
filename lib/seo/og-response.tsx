import { ImageResponse } from "next/og";
import { OgImage, ogSize } from "./og-image";

export function ogImageResponse(card: { title: string; description: string }) {
  return new ImageResponse(<OgImage title={card.title} description={card.description} />, ogSize);
}
