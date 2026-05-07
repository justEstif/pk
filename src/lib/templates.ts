export const TEMPLATES: Record<string, string> = {
  decision: `---
id: decision-{{date}}-{{slug}}
type: decision
title: {{title}}
created: {{date}}
updated: {{date}}
status: accepted
tags: [{{tags}}]
---

## Decision

What was decided.

## Context

Why this decision came up.

## Rationale

Why this option won.

## Consequences

What this changes or constrains.

## Related

Links to source, questions, notes, or superseded decisions.
`,

  note: `---
id: note-{{date}}-{{slug}}
type: note
title: {{title}}
created: {{date}}
updated: {{date}}
status: active
tags: [{{tags}}]
---

## Summary

One short paragraph.

## Details

Durable project knowledge.

## Evidence

Source links, files, quotes, or observations.

## Related

Links to related notes, decisions, or questions.
`,

  question: `---
id: question-{{date}}-{{slug}}
type: question
title: {{title}}
created: {{date}}
updated: {{date}}
status: open
tags: [{{tags}}]
---

## Question

What is being asked.

## Why It Matters

What depends on the answer.

## Current Understanding

What is known so far.

## Resolution

Leave blank until answered.
`,

  source: `---
id: source-{{date}}-{{slug}}
type: source
title: {{title}}
created: {{date}}
updated: {{date}}
status: unprocessed
tags: [{{tags}}]
---

## Source

Origin: paste URL, filename, or description here.

## Raw Material

Paste or summarize the raw input here.

## Extracted Items

Leave blank until processed — list notes/decisions/questions extracted from this source.
`,
}

export function renderTemplate(type: string, vars: Record<string, string>): string {
  const tmpl = TEMPLATES[type]
  if (!tmpl) throw new Error(`Unknown note type: ${type}`)
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    tmpl,
  )
}
