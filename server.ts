/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  readData,
  upsertLead,
  deleteLead,
  importLeads,
  setCompleted,
  toggleCompleted,
  LeadRecord,
} from "./leadsStore";
import {
  isAuthConfigured,
  isAuthenticated,
  passwordMatches,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} from "./auth";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

if (!isAuthConfigured()) {
  console.warn(
    "WARNING: MASTER_PASSWORD is not set. The app is open without a login gate. Set MASTER_PASSWORD in the environment."
  );
} else {
  console.log("Master password auth enabled (password stays server-side only).");
}

// --- Auth API (public) ---

app.get("/api/auth/status", (req, res) => {
  return res.json({
    configured: isAuthConfigured(),
    authenticated: isAuthenticated(req),
  });
});

app.post("/api/auth/login", (req, res) => {
  if (!isAuthConfigured()) {
    return res.status(500).json({ error: "MASTER_PASSWORD is not configured on the server." });
  }
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!passwordMatches(password)) {
    return res.status(401).json({ error: "Invalid password." });
  }
  setSessionCookie(res, createSessionToken());
  return res.json({ ok: true });
});

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

// Protect all other API routes
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/auth/")) return next();
  return requireAuth(req, res, next);
});

// Initialize Gemini safely (lazy init / check key)
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API successfully initialized on server.");
  } else {
    console.log("No GEMINI_API_KEY found. Server will run with static script templates.");
  }
} catch (e) {
  console.error("Failed to initialize Gemini SDK:", e);
}

// --- Persistent leads API ---

app.get("/api/leads", (_req, res) => {
  try {
    return res.json(readData());
  } catch (error: any) {
    console.error("Failed to load leads:", error);
    return res.status(500).json({ error: error.message || "Failed to load leads." });
  }
});

app.post("/api/leads", (req, res) => {
  try {
    const lead = req.body as LeadRecord;
    if (!lead?.name) {
      return res.status(400).json({ error: "Lead name is required." });
    }
    return res.json(upsertLead(lead));
  } catch (error: any) {
    console.error("Failed to save lead:", error);
    return res.status(500).json({ error: error.message || "Failed to save lead." });
  }
});

app.delete("/api/leads/:id", (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Lead id is required." });
    }
    return res.json(deleteLead(id));
  } catch (error: any) {
    console.error("Failed to delete lead:", error);
    return res.status(500).json({ error: error.message || "Failed to delete lead." });
  }
});

app.post("/api/leads/import", (req, res) => {
  try {
    const incoming = req.body;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: "Body must be a JSON array of leads." });
    }
    return res.json(importLeads(incoming as LeadRecord[]));
  } catch (error: any) {
    console.error("Failed to import leads:", error);
    return res.status(500).json({ error: error.message || "Failed to import leads." });
  }
});

app.put("/api/progress", (req, res) => {
  try {
    const completed = req.body?.completed;
    if (!completed || typeof completed !== "object") {
      return res.status(400).json({ error: "completed map is required." });
    }
    return res.json(setCompleted(completed));
  } catch (error: any) {
    console.error("Failed to update progress:", error);
    return res.status(500).json({ error: error.message || "Failed to update progress." });
  }
});

app.post("/api/progress/:id/toggle", (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Lead id is required." });
    }
    return res.json(toggleCompleted(id));
  } catch (error: any) {
    console.error("Failed to toggle progress:", error);
    return res.status(500).json({ error: error.message || "Failed to toggle progress." });
  }
});

// API endpoint to generate high-converting, tailored website sales pitch
app.post("/api/gemini/pitch", async (req, res) => {
  const { name, category, rating, reviewCount, hasWebsite, flatRate } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Company name is required." });
  }

  const hasWebsiteText = hasWebsite === "yes"
    ? "They currently have a website, but it might be slow, outdated, non-responsive, or lacks clear calls to action. Our pitch should focus on modernizing their layout, enhancing mobile speed, and driving more conversions."
    : "They currently DO NOT have a website listed. This is an exceptional growth opportunity! Pitching them a fast, modern, search-optimized landing page to capture more leads.";

  const prompt = `You are a professional, highly persuasive sales consultant for a modern website design agency.
We are reaching out to the following company to pitch them custom website development.

Company Name: ${name}
Business Category: ${category}
Rating: ${rating || "N/A"} stars (${reviewCount || 0} reviews)
Has Existing Website: ${hasWebsiteText}
Asking Flat Rate: $${flatRate || "750"}

Write a tailored, highly specific, lightweight cold call or warm messaging script. The tone must be clean, warm, collaborative, and entirely devoid of sleazy sales talk, hype, or generic jargon. 

Include these four precise sections, formatted elegantly in clean Markdown:
1. **Elevator Pitch** (1-2 friendly, impactful sentences addressing ${name} directly)
2. **Value Hook** (Explain exactly how a high-converting website helps a ${category} business convert their active local reputation into booked jobs)
3. **The Proposal** (Elegantly introduce our custom layout development for a simple, flat-rate of $${flatRate || "750"} with no recurring monthly lock-ins)
4. **The Next Step** (A soft closing suggestion: a quick, complimentary 5-minute visual homepage sketch or mockup to show them what's possible)

Keep the pitch concise, easy to read off a screen while calling, and under 90 seconds.`;

  if (!ai) {
    const staticPitch = `### Custom Sales Outline for **${name}**

*This template was generated because the Gemini API key is currently not active in Secrets.*

#### 1. Elevator Pitch
"Hi! I'm calling about **${name}**. I noticed you have an incredible **${rating || "4.8"}-star reputation** on Google with **${reviewCount || 9} reviews**, but your online web presence doesn't fully capture that expertise yet. I build hyper-fast, high-converting websites for local **${category}** companies."

#### 2. Value Hook
"With your amazing rating, potential clients are searching for you daily. ${hasWebsite === "yes" ? "Your current website has a few speed and mobile design bottlenecks that might be turning hot leads away." : "Since you don't have a website listed, you might be missing out on capturing direct local search traffic."} A custom, fully responsive layout will help convert that trust into immediate phone calls and booked appointments."

#### 3. The Proposal
"We design, build, and optimize custom websites for a transparent, single flat rate of **$${flatRate || "750"}** — with absolutely no monthly maintenance fees or lock-in contracts."

#### 4. The Next Step
"I'd love to put together a quick 5-minute visual concept mock-up of what your new homepage could look like, completely free. If I send that over early next week, would you be open to taking a quick look?"`;

    return res.json({ text: staticPitch, isFallback: true });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const pitchText = response.text || "Failed to parse pitch content.";
    return res.json({ text: pitchText, isFallback: false });
  } catch (error: any) {
    console.error("Gemini API service error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate custom sales pitch." });
  }
});

// Serve Vite dynamic assets or production static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in development mode.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lead Processor full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
