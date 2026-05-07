import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import { allNotes, REQUIRED_SECTIONS, STATUSES, TYPE_DIRS, LENGTH_WARN } from '../lib/notes.ts'
import { findKnowledgeDir } from '../lib/paths.ts'

export function registerLint(program: Command): void {
  program
    .command('lint')
    .description('Validate knowledge notes structure and frontmatter')
    .action(() => {
      const knowledgeDir = findKnowledgeDir()
      const notes = allNotes(knowledgeDir)
      const issues = []
      const ids = new Map()
      for (const n of notes) {
        const p = n.path
        if (n.err) { issues.push({ level: 'error', message: `parse error: ${n.err}`, path: p }); continue }
        for (const f of ['id','type','title','created','updated','status','tags']) {
          if (n.meta[f] === undefined || n.meta[f] === '') issues.push({ level: 'error', message: `missing frontmatter field: ${f}`, path: p })
        }
        const type = n.meta.type ?? ''
        if (!TYPE_DIRS[type]) { issues.push({ level: 'error', message: `invalid type: ${type}`, path: p }); continue }
        if (!STATUSES[type]?.includes(n.meta.status ?? '')) issues.push({ level: 'error', message: `invalid status '${n.meta.status}' for type ${type}`, path: p })
        const expected = path.resolve(knowledgeDir, TYPE_DIRS[type])
        if (path.resolve(path.dirname(p)) !== expected) issues.push({ level: 'error', message: `${type} must live in ${expected}/`, path: p })
        const id = n.meta.id ?? ''
        if (id) { if (ids.has(id)) issues.push({ level: 'error', message: `duplicate id ${id} (also in ${ids.get(id)})`, path: p }); else ids.set(id, p) }
        const sections = new Set([...n.body.matchAll(/^## (.+?)\s*$/gm)].map(m => m[1]))
        for (const req of REQUIRED_SECTIONS[type] ?? []) {
          if (!sections.has(req)) issues.push({ level: 'error', message: `missing section: ## ${req}`, path: p })
        }
        if (!Array.isArray(n.meta.tags)) issues.push({ level: 'error', message: 'tags must be a flat list', path: p })
        else if (n.meta.tags.length === 0) issues.push({ level: 'warn', message: 'tags is empty', path: p })
        const lineCount = readFileSync(p, 'utf8').split('\n').length
        const warnT = LENGTH_WARN[type]
        if (warnT && lineCount > warnT) issues.push({ level: 'warn', message: `${lineCount} lines exceeds ${type} threshold (${warnT})`, path: p })
        if (type !== 'source' && lineCount > 400) issues.push({ level: 'error', message: 'non-source note exceeds 400 lines', path: p })
        if (type === 'source' && n.meta.status === 'processed') {
          const m = n.body.match(/^## Extracted Items\s*\n([\s\S]*?)(?=^##\s|$)/m)
          if (m && !m[1]?.trim()) issues.push({ level: 'warn', message: 'processed source has empty Extracted Items', path: p })
        }
      }
      let hasError = false
      for (const issue of issues) {
        const prefix = issue.level === 'error' ? 'ERROR' : 'WARN '
        const out = issue.level === 'error' ? process.stderr : process.stdout
        out.write(`${prefix} ${issue.path}: ${issue.message}\n`)
        if (issue.level === 'error') hasError = true
      }
      if (!hasError) console.log(`lint passed (${notes.length} files, ${issues.filter(i => i.level === 'warn').length} warnings)`)
      else process.exit(1)
    })
}
