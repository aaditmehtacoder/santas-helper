"use client";

import { useState } from "react";
import {
  Gift,
  Mail,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  User,
  ShoppingBag,
  ListChecks,
  Send
} from "lucide-react";

import { Occasion, Store, GiftIdea } from "./types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [childName, setChildName] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("christmas");
  const [age, setAge] = useState<number | "">("");
  const [interests, setInterests] = useState("");
  const [store, setStore] = useState<Store>("amazon");
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [parentEmail, setParentEmail] = useState("");

  const [emailSent, setEmailSent] = useState(false);

  const canGoNextFromStep1 = childName.trim().length > 0;
  const canGoNextFromStep2 =
    typeof age === "number" && !Number.isNaN(age) && interests.trim().length > 0;
  const canGoNextFromStep3 = !!store;
  const hasIdeas = ideas.length > 0;

  const { label: stepLabel, icon: StepIcon, iconClass } = getStepMeta(step);

  async function handleGenerateIdeas() {
    if (!canGoNextFromStep2 || !canGoNextFromStep3) return;
    setLoading(true);
    setError(null);
    setEmailSent(false);

    try {
      const res = await fetch("/api/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          age,
          interests,
          store
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong");
      }

      const ideasWithLinks: GiftIdea[] = (data.ideas as GiftIdea[]).map((idea) => ({
        ...idea,
        link: buildStoreLink(store, idea.name, age)
      }));

      setIdeas(ideasWithLinks);
      setStep(4);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to talk to Santa's workshop right now.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmail() {
    if (!parentEmail || !ideas.length) return;
    setLoading(true);
    setError(null);
    setEmailSent(false);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentEmail,
          childName: childName || "Your child",
          occasion: prettyOccasion(occasion),
          store: prettyStore(store),
          ideas
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong");
      }

      setStep(6);
      setEmailSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "We couldn't send the email just now.");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setStep(1);
    setLoading(false);
    setError(null);
    setChildName("");
    setOccasion("christmas");
    setAge("");
    setInterests("");
    setStore("amazon");
    setIdeas([]);
    setParentEmail("");
    setEmailSent(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 md:flex-row">
        {/* Left hero section */}
        <section className="flex-1 space-y-5">
          <Badge>Santa&apos;s Helper • AI Gift Elf</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
            Let&apos;s build your <span className="text-rose-300">magic wish list</span>.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-300">
            I&apos;m Santa&apos;s Helper, a friendly AI elf. I&apos;ll ask a few questions
            about who the gifts are for, what they love, and where your grown-up likes to shop.
            Then I&apos;ll send a neat email with your wish list straight to them.
          </p>

          <div className="mt-4 grid max-w-md grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/10 text-rose-200">
                <Gift className="h-4 w-4" />
              </span>
              Age-smart ideas
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 text-sky-200">
                <Sparkles className="h-4 w-4" />
              </span>
              Kid-friendly words
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-200">
                <ArrowRight className="h-4 w-4" />
              </span>
              Links to real shops
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10 text-violet-200">
                <Mail className="h-4 w-4" />
              </span>
              Email to your grown-up
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-400">
            Parents: No purchases happen here. Santa&apos;s Helper only suggests presents and
            emails you a list with links to your chosen store. You&apos;re in full control.
          </p>
        </section>

        {/* Right wizard section */}
        <section className="flex-1">
          <Card>
            <CardHeader className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs ${iconClass}`}
              >
                <StepIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>{stepLabel}</CardTitle>
                <CardDescription>Step {step} of 6</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  {error}
                </div>
              )}

              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-200">
                    Hi there! I&apos;m Santa&apos;s Helper. What&apos;s your name? I&apos;ll put it on
                    the top of your wish list.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="child-name">Your first name</Label>
                    <Input
                      id="child-name"
                      placeholder="For example: Mia, Jayden, Sam..."
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>What is this wish list for?</Label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setOccasion("christmas")}
                        className={`rounded-2xl border px-3 py-2 ${
                          occasion === "christmas"
                            ? "border-rose-400 bg-rose-500/10 text-rose-100"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        Christmas
                      </button>
                      <button
                        type="button"
                        onClick={() => setOccasion("birthday")}
                        className={`rounded-2xl border px-3 py-2 ${
                          occasion === "birthday"
                            ? "border-rose-400 bg-rose-500/10 text-rose-100"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        Birthday
                      </button>
                      <button
                        type="button"
                        onClick={() => setOccasion("other")}
                        className={`rounded-2xl border px-3 py-2 ${
                          occasion === "other"
                            ? "border-rose-400 bg-rose-500/10 text-rose-100"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        Other
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="secondary"
                      size="lg"
                      disabled={!canGoNextFromStep1}
                      onClick={() => setStep(2)}
                    >
                      Next
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-200">
                    Great! Now tell me a bit about yourself. I'd love to get to know you and your interests!
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="age">How old are you?</Label>
                      <Input
                        id="age"
                        type="number"
                        min={1}
                        max={120}
                        value={age}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAge(value === "" ? "" : Number(value));
                        }}
                      />
                    </div>
                    <div className="space-y-2 text-[11px] text-slate-400">
                      <p className="font-medium text-slate-300">Sentence starters</p>
                      <p>I really like building things and reading about space.</p>
                      <p>I love drawing, cute animals, and cozy clothes.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interests">What kinds of things do you love?</Label>
                    <Textarea
                      id="interests"
                      placeholder="Tell me in your own words. For example: lego, soccer, books about dragons, coding, slime, stuffed animals..."
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                    />
                  </div>

                  <div className="mt-4 flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      disabled={!canGoNextFromStep2}
                      onClick={() => setStep(3)}
                    >
                      Next
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-200">
                    Last question before I think of gifts: where does your grown-up like to shop
                    online? I&apos;ll only use this to make the links easy for them.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="store">Choose a store</Label>
                    <Select
                      id="store"
                      value={store}
                      onChange={(e) => setStore(e.target.value as Store)}
                    >
                      <option value="amazon">Amazon</option>
                      <option value="ebay">eBay</option>
                      <option value="other">Another online store</option>
                    </Select>
                  </div>

                  <div className="mt-4 flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      disabled={!canGoNextFromStep3 || loading}
                      onClick={handleGenerateIdeas}
                    >
                      {loading ? "Talking to Santa..." : "Show me ideas"}
                      {!loading && <Sparkles className="ml-1.5 h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-200">
                    Here are some ideas I dreamed up just for{" "}
                    <span className="font-semibold text-rose-200">
                      {childName || "you"}
                    </span>
                    . You can remove anything you don&apos;t like.
                  </p>

                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {ideas.map((idea) => (
                      <div
                        key={idea.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-50">{idea.name}</p>
                          <button
                            className="text-[11px] text-slate-400 hover:text-rose-300"
                            onClick={() =>
                              setIdeas((prev) => prev.filter((x) => x.id !== idea.id))
                            }
                          >
                            Remove
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-300">{idea.description}</p>
                        {idea.link && (
                          <a
                            href={idea.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex text-[11px] text-rose-300 underline-offset-2 hover:underline"
                          >
                            Open on {prettyStore(store)}
                          </a>
                        )}
                      </div>
                    ))}
                    {!ideas.length && (
                      <p className="text-xs text-slate-400">
                        You removed everything. You can go back to change your answers or ask for
                        new ideas.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(3)}>
                      Back
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      disabled={!ideas.length}
                      onClick={() => setStep(5)}
                    >
                      Looks good
                      <CheckCircle2 className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 5 */}
              {step === 5 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-200">
                    Awesome! Last step: where should I send this wish list? Ask your grown-up
                    which email to use, then carefully type it below.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="parent-email">Parent or guardian email</Label>
                    <Input
                      id="parent-email"
                      type="email"
                      placeholder="parent@example.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    I&apos;ll send them a neat email with all your ideas and links to{" "}
                    {prettyStore(store)}. They&apos;ll decide what to buy and when.
                  </p>

                  <div className="mt-4 flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(4)}>
                      Back
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      disabled={!parentEmail || loading}
                      onClick={handleSendEmail}
                    >
                      {loading ? "Sending magic..." : "Send wish list"}
                      {!loading && <Mail className="ml-1.5 h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 6 */}
              {step === 6 && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-50">
                    Wish list sent!
                  </h2>
                  <p className="text-sm text-slate-300">
                    Your list is on its way to{" "}
                    <span className="font-medium">{parentEmail}</span>. You&apos;ve done your
                    part—now Santa and your grown-ups will take it from here.
                  </p>
                  <Button variant="secondary" size="lg" onClick={resetAll}>
                    Make a new wish list
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

/* ---------- Helpers ---------- */

function prettyOccasion(o: Occasion): string {
  if (o === "christmas") return "Christmas";
  if (o === "birthday") return "Birthday";
  return "a special occasion";
}

function prettyStore(s: Store): string {
  if (s === "amazon") return "Amazon";
  if (s === "ebay") return "eBay";
  return "your chosen online store";
}

function buildStoreLink(store: Store, name: string, age: number | ""): string {
  const query = encodeURIComponent(`${name} gift for ${age || ""} year old`);
  switch (store) {
    case "amazon":
      return `https://www.amazon.com/s?k=${query}`;
    case "ebay":
      return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
    default:
      return `https://www.google.com/search?q=${query}`;
  }
}

function getStepMeta(step: Step): {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
} {
  switch (step) {
    case 1:
      return {
        label: "Welcome",
        icon: Sparkles,
        iconClass: "bg-rose-500/15 text-rose-200 border-rose-400/60"
      };
    case 2:
      return {
        label: "About the kid",
        icon: User,
        iconClass: "bg-sky-500/15 text-sky-200 border-sky-400/60"
      };
    case 3:
      return {
        label: "Where to shop",
        icon: ShoppingBag,
        iconClass: "bg-emerald-500/15 text-emerald-200 border-emerald-400/60"
      };
    case 4:
      return {
        label: "Gift ideas",
        icon: Gift,
        iconClass: "bg-violet-500/15 text-violet-200 border-violet-400/60"
      };
    case 5:
      return {
        label: "Send to parent",
        icon: Send,
        iconClass: "bg-indigo-500/15 text-indigo-200 border-indigo-400/60"
      };
    case 6:
    default:
      return {
        label: "All set!",
        icon: CheckCircle2,
        iconClass: "bg-emerald-500/15 text-emerald-200 border-emerald-400/60"
      };
  }
}
