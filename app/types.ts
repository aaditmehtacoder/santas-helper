export type Occasion = "christmas" | "birthday" | "other";
export type Store = "amazon" | "ebay" | "other";

export interface GiftIdea {
  id: string;
  name: string;
  description: string;
  link?: string;
}
