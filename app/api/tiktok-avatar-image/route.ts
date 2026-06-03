export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  try {
    const imageRes = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://www.tiktok.com/",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!imageRes.ok) {
      return new Response(`Image fetch failed: ${imageRes.status}`, {
        status: 502,
      });
    }

    const arrayBuffer = await imageRes.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": imageRes.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (err) {
    console.log("Avatar image proxy error:", err);
    return new Response("Image fetch failed", { status: 500 });
  }
}