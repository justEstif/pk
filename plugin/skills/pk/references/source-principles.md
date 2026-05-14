# Governance Documentation Source Principles

Based on Frederick Vanbrabant's articles:

- Governance: Documentation as a Knowledge Network (2026-03-07)
- Governance: Documentation to support projects (2026-03-22)

## Knowledge Network Principles

- Tools are usually not the problem; setup is. Confluence, Notion, Slite, SharePoint, etc. can work if the information architecture is deliberate.
- Knowledge graph beats folder dump: valuable knowledge is often in relationships between pages, not only in page content.
- MOCs (Maps of Content) are landing pages that both introduce a topic and route readers to deeper nodes.
- Atomic documentation means one concept per page. Use links/transclusion instead of repeating definitions.
- Folder structure remains useful as an adoption ramp for new users, but links should become the primary navigation once readers enter.
- Recommended top-level folders: Projects, Applications, Processes, Resources, Archive.
- Archive prevents broken links and preserves reuse value; use banners/status where tooling allows.
- Metadata worth adding: creation date, last-updated date, author, maybe status. Old information is not automatically bad.
- LLMs should support writing, not replace ownership. Atomic, linked notes reduce temptation to generate giant documents.

## Project Documentation Principles

Documentation should grow organically from actual project communication and problems. If an issue happened once, documenting it prevents repeated confusion.

Four project areas:

1. **Strategy** — Business Case, Kick-off Document.
2. **Logs** — Open Questions Log, Decision Log, Constraint Log, Meeting Notes.
3. **Blueprints** — TO-BE Diagram, AS-IS Diagram, Data Model, Phasing Diagrams.
4. **Program Management** — Gantt chart / critical path.

### Core Project Artifacts

Always consider these first:

- Business Case: the approved why; missing clarity causes drift.
- Decision & Question Logs: high-value historical nodes for future maintainers.
- TO-BE Diagram: quick shared reference for what changes.
- Gantt: centralizes timing, gates, dependencies, and impact.

### Logs

Question Log fields: ID, descriptive name, dated history, priority, assignee, status. Link solved questions to the Decision Log.

Decision Log should capture: decision, context/question, chosen option, alternatives considered, why alternatives were rejected, constraints/trade-offs.

Constraint Log should capture budget, compliance, technical constraints, and other non-negotiables useful for onboarding.

Meeting notes can be AI-assisted because they are raw project evidence, not polished canonical docs.

### Diagrams

Keep both editable raw formats and static exports. Add labels: author, date, status. For large projects, include AS-IS, TO-BE, and phase views. Data models help tool experts reason in systems of record and data flows.

### Project Close

At close, project docs should not fade out. Run a retrospective and merge durable artifacts:

- Project target state becomes current state for the relevant application/process.
- Decisions/questions/constraints move or link into affected domain nodes.
- Diagrams move to application/process/resource areas.
- Remaining project material moves to Archive.

## Evaluation Heuristics

Ask these when reviewing a documentation system:

- Can a newcomer find the right starting MOC in two clicks?
- Does each important concept have one canonical definition?
- Are decisions linked from the applications/processes they affect?
- Are open questions visible enough to manage project risk?
- Can readers move from high-level overview to technical specifics by following links?
- Would deleting a project folder break useful organisational memory?
- Is documentation scaled to risk, or copied from a framework checklist?
