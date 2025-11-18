import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import type { GiftIdea } from "@/app/types";

const bodySchema = z.object({
  parentEmail: z.string().email(),
  childName: z.string().min(1),
  occasion: z.string().min(1),
  store: z.string().min(1),
  ideas: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      link: z.string().optional()
    })
  )
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { parentEmail, childName, occasion, store, ideas } = parsed.data as {
    parentEmail: string;
    childName: string;
    occasion: string;
    store: string;
    ideas: GiftIdea[];
  };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Santa's Helper <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY not set. Email will not be sent.");
    return NextResponse.json({
      mocked: true,
      message: "Email not sent because RESEND_API_KEY is missing, but payload is valid."
    });
  }

  const resend = new Resend(apiKey);

  const subject = `🎁 ${childName}'s ${occasion} wish list from Santa's Helper`;
  const html = buildEmailHtml(childName, occasion, store, ideas);
  const text = buildEmailText(childName, occasion, store, ideas);

  try {
    const { error } = await resend.emails.send({
      from,
      to: parentEmail,
      subject,
      html,
      text
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

function buildEmailHtml(
  childName: string,
  occasion: string,
  store: string,
  ideas: GiftIdea[]
) {
  const listItems = ideas
    .map(
      (idea) => `
      <li style="margin-bottom: 12px;">
        <strong>${escapeHtml(idea.name)}</strong><br/>
        <span style="color:#64748b">${escapeHtml(idea.description)}</span><br/>
        ${
          idea.link
            ? `<a href="${idea.link}" style="color:#ec4899;text-decoration:none;">View on ${store}</a>`
            : ""
        }
      </li>
    `
    )
    .join("");

  return `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#020617; color:#e2e8f0; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#020617;border-radius:24px;border:1px solid #1f2937;padding:24px;">
      <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#fb7185;margin:0 0 12px 0;">
        Santa&apos;s Helper
      </p>
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#f9fafb;">
        ${escapeHtml(childName)} has built a wish list for ${escapeHtml(occasion)} 🎄
      </h1>
      <p style="margin:0 0 20px 0;font-size:14px;color:#9ca3af;">
        Hi there! Santa&apos;s Helper is an AI-powered gift elf that helps kids think about what they might enjoy,
        then sends you this list so you can decide what, when, and how to purchase.
      </p>
      <p style="margin:0 0 4px 0;font-size:13px;color:#e5e7eb;"><strong>Preferred store:</strong> ${escapeHtml(
        store
      )}</p>

      <ol style="margin:16px 0 24px 24px;padding:0;font-size:14px;">
        ${listItems}
      </ol>

      <p style="margin:0;font-size:12px;color:#6b7280;">
        You&apos;re receiving this email because your child used Santa&apos;s Helper to create a wish list.
        You&apos;re in full control of what (if anything) you decide to purchase.
      </p>
    </div>
  </div>
  `;
}

function buildEmailText(
  childName: string,
  occasion: string,
  store: string,
  ideas: GiftIdea[]
) {
  const list = ideas
    .map((idea, idx) => {
      return `${idx + 1}. ${idea.name}
   ${idea.description}
   ${idea.link ? "Link: " + idea.link : ""}`;
    })
    .join("\n\n");

  return `${childName} has built a wish list for ${occasion}.

Preferred store: ${store}

${list}

You are receiving this because your child used Santa's Helper to create a wish list. You decide what, when, and how to purchase.`;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
