// The Room Walkthrough model's "category" field is freeform text (e.g.
// "window", "outlet", "flooring") rather than a fixed enum, so colors are
// assigned deterministically by hashing the string instead of maintaining a
// lookup table — the same category always renders in the same color, and
// unseen categories still get a distinct, stable color for free.
const CATEGORY_PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-indigo-100 text-indigo-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-lime-100 text-lime-700",
];

export function categoryStyle(category: string): string {
  const key = category.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}
