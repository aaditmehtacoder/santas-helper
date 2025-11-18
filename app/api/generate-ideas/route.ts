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
  const model = process.env.GEMINI_MODEL || "gemini-pro"; // 👈 configurable, safe default

  // Helper: static fallback ideas (used when no key or API errors)
  const fallbackIdeas: GiftIdea[] = [
    {
      id: "1",
      name: "STEM Building Kit",
      description: "A hands-on kit with simple experiments chosen for their age."
    },
    {
      id: "2",
      name:
        "Storybook about " + (interests.split(",")[0]?.trim() || "big adventures"),
      description:
        "A beautifully illustrated story that matches what they love reading about."
    },
    {
      id: "3",
      name: "Cozy Hoodie",
      description:
        "A comfy hoodie in their favorite color so they can feel hugged by home."
    },
    {
      id: "4",
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
You are Santa's Helper, a warm, kid-friendly gift recommendation elf.

Return ONLY strict JSON in this shape:
{
  "ideas": [
    { "name": "string", "description": "string" }
  ]
}

Rules:
- 4 to 6 ideas total.
- Tailor ideas to:
  - age: ${age}
  - occasion: ${occasion}
  - interests: ${interests}
- Use simple language a child can understand.
- Avoid screens if the child is under 8 unless clearly educational.
- Avoid prices; focus on why the gift is special.

Now create the ideas.
`;

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      apiKey;

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
