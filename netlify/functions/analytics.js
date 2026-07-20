// Netlify Function - simple self-built analytics (page views + recent visits)
// GET (with ?password=...)  -> returns stats, password-protected (used by analytics.html)
// POST -> records a page view, no auth needed (fired from every public page on load)
//
// Data is stored in Netlify Blobs - fully owned by this Netlify project,
// no third-party analytics service involved.
//
// Uses the same ADMIN_PASSWORD environment variable as the availability function.

import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_RECENT_VISITS = 200; // ලොකු වෙන්නම ඉඩ නොදී, recent visits ටික මෙච්චර ගාණකට limit කරනවා

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const store = getStore("analytics");

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const page = (body.page || "unknown").slice(0, 80); // sanity length cap

    const data = (await store.get("data", { type: "json" })) || { pageViews: {}, recentVisits: [] };
    data.pageViews[page] = (data.pageViews[page] || 0) + 1;
    data.recentVisits.unshift({ page, time: new Date().toISOString() });
    if (data.recentVisits.length > MAX_RECENT_VISITS) {
      data.recentVisits = data.recentVisits.slice(0, MAX_RECENT_VISITS);
    }

    await store.setJSON("data", data);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const password = url.searchParams.get("password");

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Incorrect password" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const data = (await store.get("data", { type: "json" })) || { pageViews: {}, recentVisits: [] };
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
};

export const config = {
  path: "/api/analytics",
};
