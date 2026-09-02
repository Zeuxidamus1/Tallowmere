import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Tallowmere — The old woods remember";
const description = "An old-world browser idle RPG where the forest keeps growing while you are away.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title,
    description,
    openGraph: { title, description, type:"website", images:[{ url:image, width:1672, height:941, alt:"Tallowmere pixel-art forest" }] },
    twitter: { card:"summary_large_image", title, description, images:[image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
