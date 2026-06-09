export const config = {
  runtime: 'edge', // Memakai Edge runtime biar prosesnya secepat kilat
};

export default async function handler(request) {
  // Setup CORS Headers agar panel Bookmarklet lu bisa akses dari domain mana pun
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight request (OPTIONS) dari browser
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Ambil parameter '?key=...' dari URL yang dikirim script client
  const { searchParams } = new URL(request.url);
  const userKey = searchParams.get("key")?.toLowerCase().trim();

  if (!userKey) {
    return new Response(JSON.stringify({ status: "error", message: "Key kosong" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // 🔒 Otomatis mengambil link Rentry rahasia dari Environment Variables yang lu isi tadi
    const baseRentryUrl = process.env.RENTRY_URL;
    
    if (!baseRentryUrl) {
      return new Response(JSON.stringify({ status: "error", message: "Konfigurasi RENTRY_URL di Vercel belum diset" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Ditambahkan '?v=' + Date.now() agar Vercel selalu mengambil data paling fresh (anti-cache)
    const rentryRawUrl = `${baseRentryUrl.replace(/\/$/, "")}?v=${Date.now()}`;
    
    // Server Vercel melakukan fetch ke Rentry rahasia (Aman, user gak bisa ngintip)
    const response = await fetch(rentryRawUrl);
    if (!response.ok) {
      throw new Error("Gagal mengambil data dari database rahasia");
    }

    const data = await response.json();
    const validKeys = data.keys || {};
    
    // Proses validasi/pencocokan key di dalam server Vercel
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
    return new Response(JSON.stringify({ status: "error", message: "Internal Server Error atau JSON Rentry Rusak" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
