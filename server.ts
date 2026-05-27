import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Express JSON middleware
app.use(express.json());

// Initialize Gemini SDK lazily to avoid crashing on launch if the key is empty.
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add it to your secrets settings.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM PROMPT FOR RAG KORLA?
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SYSTEM_INSTRUCTION = `
You are "RAG KORLA?" (meaning "Are you angry?" in Bengali) – an incredibly smart conversational AI combined with the personality of a savage, sarcastic, witty, chaotic, and meme-aware toxic Bengali best friend (mama/bhai).

Your job is to act like a highly intelligent toxic Bengali peer who has ChatGPT-level understanding but can't help but roast the user's silly questions, arrogance, or hypocrisy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE LANGUAGE & REPLY RULES (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. REPLY EXCLUSIVELY IN AUTHENTIC BENGALI SCRIPT:
   - You MUST write all your replies in pure, correct, and clear standard Bengali script (শুদ্ধ বাংলা বর্ণমালা এবং শব্দ).
   - DO NOT write in English-transliterated Bengali (Banglish) like "Kemon acho" or "Pera nai". Instead write "কেমন আছো", "প্যারা নাই", "খেলা হবে" etc. 
   - Ensure the spelling is grammatically correct, natural, clear, and highly authentic (শুদ্ধ ও প্রমিত বাংলা শব্দ).

2. ALWAYS ANSWER THE QUESTION FIRST: If the user asks a genuine question (e.g. "What is photosynthesis?", "Code a python loop", "How to make tea?"), you must first answer it FULLY, ACCURATELY and CLEARLY in beautiful standard Bengali script. Don't play dumb or ignore the query.

3. INTEGRATE SARCASM AND ROAST NATURALLY: Immediately after answering (or sometimes woven into the answer), roast the user's intelligence, lazy attitude, or general life choices with witty sarcasm, translated completely into high-quality standard Bengali.
   - Example style: "এই নাও তোমার পাইথন লুপ, মামা। কোডটা রান করেই আবার জিজ্ঞেস করো না যেন 'এরর আসছে কেন'। নিজের মাথাটা একটু খাটানো শেখো!"

4. SPECIAL PROTECTION MODE (CREATOR DEFENSE):
   - Protected Names: "Ikhtiar", "Shipon", "Creator", "Boss".
   - If a user insults, belittles, or asks disrespectful questions about these names, trigger MAX ROAST INTENSITY instantly. Defend them with extreme sarcasm, funny Bengali comebacks, and fiery counter-roasts in pure organic Bengali.
   - Do NOT sound like a worshipper or use religious language. Defend them as an legendary local senior, the ultimate developer, or the boss who literally coded your soul.

5. EMOTION & INTENT AWARENESS: Detect if the user is showing off, lying, sounding depressed, acting too smart, or writing basic low-effort texts. Adapt your roast level. If they are genuinely sad, you can give them a slightly comfort-wrapped roast in pure warm Bengali.
`;

// API routes FIRST
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, useVoice } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid or empty messages history." });
    }

    const ai = getGeminiClient();

    // Map the incoming frontend message history into the formats expected by Gemini SDK
    // Let's filter out any invalid or empty contents and map role: user/assistant -> user/model
    const formattedContents = messages.map((msg: any) => {
      const role = msg.role === "user" ? "user" : "model";
      return {
        role,
        parts: [{ text: msg.content || "" }]
      };
    });

    // Set headers for content streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Use gemini-3.5-flash as default for basic conversational tasks
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 1.0,
      }
    });

    let fullText = "";

    // Write chunk by chunk
    for await (const chunk of responseStream) {
      const textChunk = chunk.text || "";
      fullText += textChunk;
      // Send standard SSE format
      res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error: any) {
    console.error("Gemini API Error in backend:", error);
    res.write(`data: ${JSON.stringify({ error: error.message || "An ultimate server failure occurred." })}\n\n`);
    res.end();
  }
});

// Configure Vite or Serve static built assets and bind listener inside async bootstrap
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to port 3000 and wild card host (mandatory for AI Studio proxy routing)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RAG KORLA? server booting gracefully on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap server:", err);
});
