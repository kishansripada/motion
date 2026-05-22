// Brand + copy for Panoptive's LinkedIn launch video. One source of truth so
// edits to the pitch don't require hunting through six scene files.

// Panoptive's site reads as a clinical-tech brand: medical-grade rigor with
// AI capability. The canvas stays pure black (rule 3 — palette continuity
// across all six scenes); we let the cyan accent do all the talking, with
// signal-amber for "deviation detected" and confirmation-green for
// "audit-ready". Three colors tops — anything more reads as a logo soup.
export const CYAN = "#22d3ee";
export const CYAN_DIM = "#22d3ee33";
export const CYAN_GHOST = "#22d3ee14";
export const SIGNAL = "#f59e0b"; // amber for "deviation detected"
export const SIGNAL_DIM = "#f59e0b22";
export const AUDIT = "#10b981"; // green for "audit-ready / verified"
export const AUDIT_DIM = "#10b98122";

export const PANOPTIVE = {
   name: "Panoptive",
   // The tagline reveals word-by-word in TitleScene as the value-prop hero
   // line. Author it as two lines (the line break is rendered, not just a
   // visual hint) so the hero composition is deterministic at any size.
   taglineLines: [
      ["Run", "and", "defend"],
      ["clinical", "trial", "oversight"],
   ] as const,
   payoff: "Defensible sponsor oversight, without the reconstruction.",
   url: "panoptive.com",
} as const;

// The cold-open report. Real Panoptive demo on the site uses "Site 12 Monthly
// Report · 73 pages" so we lift it verbatim — the size of the document is
// the entire point of the beat.
export const REPORT = {
   title: "Site 12 Monitoring Report",
   pages: 73,
   meta: "Monthly · uploaded 2 min ago",
} as const;

// The three signals the AI extracts in the Signals beat. Each is a real
// pharma deviation type so the audience (clinical ops / quality leads)
// reads them as authentic, not as marketing-fiction.
export const SIGNALS = [
   {
      label: "Protocol deviation",
      detail: "Inclusion criteria not met · Subject 2042-11",
      page: "p. 14",
   },
   {
      label: "Consent signature misfiled",
      detail: "ICF dated, page 3 missing · Subject 2042-08",
      page: "p. 31",
   },
   {
      label: "AE under-reporting",
      detail: "Grade 2 nausea logged in source, not EDC",
      page: "p. 56",
   },
] as const;

// The decision record we auto-draft. Pulled almost verbatim from
// panoptive.com so the screenshot reads as "this is the actual product".
export const DECISION = {
   classification: "Minor protocol deviation — documentation",
   rationale:
      "Informed consent obtained but signature page misfiled. No impact on subject safety or data integrity per ICH E6(R3) 3.9.3.",
   citations: ["ICH E6(R3) 3.9.3", "Protocol v2.1 §8.3", "SOP-CM-042"],
   action: "Site to refile within 5 business days.",
   generatedIn: 47, // seconds — the demo claim on the site
} as const;

// The four nodes of the Panoptive Loop. Order is sacred — Data In, then
// Signals, then Decision, then Audit Trail, then back. The names match the
// site's "The Panoptive Loop" section so the video acts as a recap of the
// product page.
export const LOOP_NODES = [
   {
      key: "data",
      title: "Data In",
      sub: "monitoring reports + EDC",
   },
   {
      key: "signals",
      title: "Signals Detected",
      sub: "deviations + safety findings",
   },
   {
      key: "decision",
      title: "Decision Made",
      sub: "rationale + citations",
   },
   {
      key: "audit",
      title: "Audit Trail",
      sub: "inspection-ready record",
   },
] as const;

// The numeric payoff in the outro. Three numbers, all from panoptive.com's
// claims so we can stand behind them.
export const PAYOFF = [
   { value: "3 hrs → 15 min", label: "per deviation, documented" },
   { value: "47s", label: "to draft a decision record" },
   { value: "100%", label: "inspection-ready by default" },
] as const;
