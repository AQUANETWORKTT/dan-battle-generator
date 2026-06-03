export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return new Response("Missing url", {
        status: 400,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    if (!url.startsWith("https://") || !url.includes("tiktokcdn")) {
      return new Response("Invalid image url", {
        status: 400,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    const imageRes = await fetch(url, {
      method: "GET",
      cache: "no-store",
      next: { revalidate: 0 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!imageRes.ok) {
      return new Response("Image fetch failed", {
        status: imageRes.status,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    const arrayBuffer = await imageRes.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": imageRes.headers.get("content-type") || "image/jpeg",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    console.log("TikTok avatar image proxy error:", err);

    return new Response("Image proxy failed", {
      status: 500,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }
}
