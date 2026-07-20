// Netlify Function - availability booking data
// GET  -> anyone can read the current blocked dates (used by booking.html)
// POST -> only allowed with the correct ADMIN_PASSWORD (used by admin.html)
//
// Data is stored in Netlify Blobs - fully owned by this Netlify project,
// no third-party service (JSONBin etc.) involved.
//
// SETUP REQUIRED (one time, in the Netlify dashboard):
// Site configuration -> Environment variables -> Add a variable:
//   Key:   ADMIN_PASSWORD
//   Value: <a password you choose>
// This keeps the real password out of the source code entirely.

import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const store = getStore("availability");

  if (req.method === "GET") {
    const blockedDates = (await store.get("blockedDates", { type: "json" })) || [];
    return new Response(JSON.stringify({ blockedDates }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

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

    const { password, blockedDates } = body;

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Incorrect password" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!Array.isArray(blockedDates)) {
      return new Response(JSON.stringify({ error: "blockedDates must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await store.setJSON("blockedDates", blockedDates);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
};

export const config = {
  path: "/api/availability",
};
