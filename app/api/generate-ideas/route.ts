import { NextResponse } from "next/server";
import { z } from "zod";
import type { Occasion, Store, GiftIdea } from "@/app/types";

const bodySchema = z.object({
  occasion: z.string(),
  age: z.number(),
  interests: z.string(),
  store: z.string()
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { occasion, age, interests, store } = parsed.data as {
    occasion: Occasion;
    age: number;
    interests: string;
    store: Store;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-pro"; // 👈 configurable, safe default

  // Helper: static fallback ideas (used when no key or API errors)
  const fallbackIdeas: GiftIdea[] = [
    {
      id: "1",
      name: "STEM Building Kit",
      description: "A hands-on kit with simple experiments chosen for their age."
    },
    {
      id: "2",
      name: "Cozy Hoodie",
      description:
        "A comfy hoodie in their favorite color so they can feel hugged by home."
    },
    {
      id: "3",
      name: "Activity Pack",
      description:
        "Stickers, markers, and a small notebook so they can draw, write, and dream."
    }
  ];

  // If no Gemini key → just use fallback
  if (!apiKey) {
    console.warn("[Santa's Helper] GEMINI_API_KEY not set. Using fallback ideas.");
    return NextResponse.json({ ideas: fallbackIdeas });
  }

  const prompt = `
You are Santa's Helper, a warm, kid-friendly AI elf who gives SPECIFIC gift recommendations.

Return ONLY valid JSON in this exact format:

{
  "ideas": [
    { "name": "string", "description": "string" }
  ]
}

RULES FOR EACH GIFT IDEA:
- The "name" MUST be a SPECIFIC product name that exists on real stores (Amazon, eBay).
- Make the product name very searchable and specific.
  Examples:
    "LEGO Star Wars Mandalorian Fang Fighter Set"
    "Crayola Light-Up Tracing Pad for Kids"
    "National Geographic Break Open Geodes Kit"
    "Nintendo Switch Lite (Turquoise)"
- Do NOT invent fake products or brands — use well-known categories and brand names.
- Avoid generic names like "space book" or "puzzle"; instead use:
    "National Geographic Kids Space Encyclopedia (Hardcover)"
    "ThinkFun Gravity Maze Marble Run"
    "Melissa & Doug Wooden Animal Stamps Set"

CONTENT RULES:
- 4 to 6 ideas total.
- Match all recommendations to:
    - age: ${age}
    - interests: ${interests}
    - occasion: ${occasion}
- If age < 8:
    - Avoid anything requiring reading level above their age.
    - Avoid screens unless clearly educational and simple.
- If age 8–12:
    - Include 1 creative item, 1 educational item, and 1 fun/active item.
- If age 13+:
    - You may include tech gadgets, hobby kits, books, sports gear, or fashion.
- Use warm, friendly kid-language in the descriptions.
- The description must tell WHY the child would like it (not just what it is).

NO EXTRA TEXT. Only return the JSON.
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Santa's Helper] Gemini error:", errText);
      // ❗ Instead of throwing → gracefully fall back
      return NextResponse.json({ ideas: fallbackIdeas });
    }

    const data = await res.json();

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      JSON.stringify({ ideas: [] });

    let parsedIdeas: { ideas: { name: string; description: string }[] };

    try {
      // Direct JSON first
      parsedIdeas = JSON.parse(rawText);
    } catch {
      // If Gemini wrapped in markdown, try to extract the JSON block
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        console.warn("[Santa's Helper] Could not parse Gemini JSON, using fallback.");
        return NextResponse.json({ ideas: fallbackIdeas });
      }
      parsedIdeas = JSON.parse(match[0]);
    }

    if (!parsedIdeas.ideas || !Array.isArray(parsedIdeas.ideas)) {
      console.warn("[Santa's Helper] Gemini returned no ideas, using fallback.");
      return NextResponse.json({ ideas: fallbackIdeas });
    }

    const ideas: GiftIdea[] = parsedIdeas.ideas.map((idea, idx) => ({
      id: String(idx + 1),
      name: idea.name,
      description: idea.description
    }));

    // If Gemini gave an empty list, still fall back
    if (!ideas.length) {
      return NextResponse.json({ ideas: fallbackIdeas });
    }

    return NextResponse.json({ ideas });
  } catch (err) {
    console.error("[Santa's Helper] Unexpected Gemini error:", err);
    return NextResponse.json({ ideas: fallbackIdeas });
  }
}
