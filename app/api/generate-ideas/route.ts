import { NextResponse } from "next/server";
import { z } from "zod";
import type { Occasion, Store } from "@/app/types";

const bodySchema = z.object({
  occasion: z.string(),
  age: z.number(),
  interests: z.string(),
  store: z.string()
});

type PricedIdea = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
};

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
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  // Static fallback ideas (with approximate prices) in case Gemini fails
  const fallbackIdeas: PricedIdea[] = [
    {
      id: "1",
      name: "National Geographic Kids Space Encyclopedia (Hardcover)",
      description:
        "A colorful, kid-friendly space book packed with planets, galaxies, and fun facts.",
      priceUsd: 18.99
    },
    {
      id: "2",
      name: "LEGO Creator 3-in-1 Building Set",
      description:
        "A creative LEGO kit that lets them build and rebuild three different models.",
      priceUsd: 24.99
    },
    {
      id: "3",
      name: "Crayola Light-Up Tracing Pad",
      description:
        "A light-up drawing pad for tracing characters, outfits, and their own art ideas.",
      priceUsd: 21.5
    },
    {
      id: "4",
      name: "ThinkFun Gravity Maze Marble Run",
      description:
        "A logic puzzle and marble run that challenges them to design paths and solve levels.",
      priceUsd: 29.99
    },
    {
      id: "5",
      name: "Cozy Fleece Hoodie",
      description:
        "A soft hoodie in their favorite color so they can feel warm and hugged by home.",
      priceUsd: 19.99
    }
  ];

  // If no Gemini key → always use fallback
  if (!apiKey) {
    console.warn("[Santa's Helper] GEMINI_API_KEY not set. Using fallback ideas.");
    return NextResponse.json({ ideas: sortIdeasByPrice(fallbackIdeas).slice(0, 5) });
  }

  const prompt = `
You are Santa's Helper, a warm, kid-friendly gift recommendation elf.

You must return ONLY valid JSON in this exact format:

{
  "ideas": [
    {
      "name": "string",
      "description": "string",
      "priceUsd": number
    }
  ]
}

REQUIREMENTS:

1. ITEM FORMAT
- "name": A SPECIFIC product name that exists on real online stores (Amazon, eBay, etc.).
  Examples of good names (don't use it, this is just an example):
    - "National Geographic Kids Space Encyclopedia (Hardcover)"
    - "LEGO Star Wars Mandalorian Fang Fighter Set"
    - "Crayola Light-Up Tracing Pad for Kids"
    - "ThinkFun Gravity Maze Marble Run"
    - "Nintendo Switch Lite (Turquoise)"
- Avoid fake brands or nonsense items.
- Avoid vague names like "A cool space book" or "Art kit". Always be specific.

2. PRICE
- "priceUsd": a realistic average price in USD for that product as a plain number (no currency symbol).
  Example:
    "priceUsd": 24.99
- The prices should be reasonable for real-world products in 2025.

3. DESCRIPTION
- "description": short, warm, kid-friendly explanation of WHY this gift fits the child.
- Use words a kid can understand.
- Mention what makes the gift special or fun.

4. MATCH THE CHILD
- age: ${age}
- interests: ${interests}
- occasion: ${occasion}

Guidance by age:
- If age < 8:
  - Focus on toys, crafts, simple STEM, picture books.
  - Avoid complex text-heavy books or advanced gadgets.
- If age 8–12:
  - Include a mix of creative, educational, and fun/active items.
- If age 13+:
  - You may include tech gadgets, hobby kits, books, sports gear, style/fashion, etc.

5. RESULT COUNT AND ORDER
- Return EXACTLY 5 items in the "ideas" array.
- Do NOT sort by price yourself. Just provide realistic "priceUsd" values.

NO EXTRA TEXT. NO MARKDOWN. ONLY the JSON object described above.
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
      const sortedFallback = sortIdeasByPrice(fallbackIdeas).slice(0, 5);
      return NextResponse.json({ ideas: sortedFallback });
    }

    const data = await res.json();

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      JSON.stringify({ ideas: [] });

    let parsed: { ideas: { name: string; description: string; priceUsd: number }[] };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        console.warn("[Santa's Helper] Could not parse Gemini JSON, using fallback.");
        const sortedFallback = sortIdeasByPrice(fallbackIdeas).slice(0, 5);
        return NextResponse.json({ ideas: sortedFallback });
      }
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      console.warn("[Santa's Helper] Gemini returned no ideas, using fallback.");
      const sortedFallback = sortIdeasByPrice(fallbackIdeas).slice(0, 5);
      return NextResponse.json({ ideas: sortedFallback });
    }

    const ideas: PricedIdea[] = parsed.ideas
      .filter((idea) => typeof idea.priceUsd === "number" && idea.name && idea.description)
      .slice(0, 5)
      .map((idea, idx) => ({
        id: String(idx + 1),
        name: idea.name,
        description: idea.description,
        priceUsd: idea.priceUsd
      }));

    if (!ideas.length) {
      const sortedFallback = sortIdeasByPrice(fallbackIdeas).slice(0, 5);
      return NextResponse.json({ ideas: sortedFallback });
    }

    const sorted = sortIdeasByPrice(ideas).slice(0, 5);
    return NextResponse.json({ ideas: sorted });
  } catch (err) {
    console.error("[Santa's Helper] Unexpected Gemini error:", err);
    const sortedFallback = sortIdeasByPrice(fallbackIdeas).slice(0, 5);
    return NextResponse.json({ ideas: sortedFallback });
  }
}

function sortIdeasByPrice(ideas: PricedIdea[]): PricedIdea[] {
  return [...ideas].sort((a, b) => a.priceUsd - b.priceUsd);
}
