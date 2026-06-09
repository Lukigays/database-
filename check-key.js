export const config = {
  runtime: 'edge', // Memakai Edge runtime biar super cepat
};

export default async function handler(request) {
  // Setup CORS agar script bookmarklet lu di domain mana pun bisa ngakses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Mengambil parameter '?key=...' dari URL yang dikirim script client
  const { searchParams } = new URL(request.url);
  const userKey = searchParams.get("key")?.toLowerCase().trim();

  if (!userKey) {
    return new Response(JSON.stringify({ status: "error", message: "Key kosong" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // 🔴 GANTI LINK DI BAWAH INI PAKE LINK RAW RENTRY LU YANG DI STEP 1 KANAN!
    // Ditambah '?v=' + Date.now() biar Vercel selalu ambil yang terbaru (anti-cache)
    const rentryRawUrl = "https://rentry.co/lukyydatabase/raw?v=" + Date.now();

    const response = await fetch(rentryRawUrl);
    if (!response.ok) {
      throw new Error("Gagal mengambil data dari database rahasia");
    }

    const data = await response.json();
    const validKeys = data.keys || {};

    // Logic pengecekan key di dalam server Vercel
    if (validKeys.hasOwnProperty(userKey)) {
      const expiry = validKeys[userKey];
      const currentTime = Date.now();

      if (expiry === "permanent") {
        return new Response(JSON.stringify({ status: "success", type: "permanent" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        const parsedExpiry = Number(expiry);
        if (!isNaN(parsedExpiry) && currentTime < parsedExpiry) {
          return new Response(JSON.stringify({ status: "success", type: "temporary", expiresAt: parsedExpiry }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } else {
          return new Response(JSON.stringify({ status: "expired" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    } else {
      return new Response(JSON.stringify({ status: "invalid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
