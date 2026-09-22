// Model text arrives as freeform sentences with no guaranteed casing, and
// occasionally \n-separated lines — normalize for display: trim, capitalize
// the first letter of the string and of any line after a newline, and drop
// blank lines. Pair with the "whitespace-pre-line" class so \n actually
// breaks the line instead of collapsing like normal HTML whitespace.
export function formatText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.charAt(0).toUpperCase() + line.slice(1))
    .join("\n");
}

// For short labels (a defect signature, an element name, a detected
// location) rather than sentences — on screen these get this same treatment
// for free via the "capitalize" CSS class, but PDF exports have no CSS, so
// this is the JS equivalent of text-transform: capitalize.
export function titleCase(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}
