import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Tallowmere — The city gates are open";
const description = "An old-world browser idle RPG of gathering, trading, and growing stronger while you are away.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = new URL("/tallowmere-city.png", `${protocol}://${host}`).toString();

  return {
    title,
    description,
    openGraph: { title, description, type:"website", images:[{ url:image, width:1536, height:1024, alt:"Tallowmere City pixel-art map" }] },
    twitter: { card:"summary_large_image", title, description, images:[image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
