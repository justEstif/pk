import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import { findKnowledgeDir } from '../lib/paths.ts'
import { renderTemplate } from '../lib/templates.ts'
import { TYPE_DIRS, slugify } from '../lib/notes.ts'

export function registerNew(program: Command): void {
   program
      .command('new <type> <title>')
      .description('Create a new knowledge note')
      .option('--tags <tags>', 'Comma-separated tags', '')
      .action((type: string, title: string, opts: { tags: string }) => {
         if (!TYPE_DIRS[type]) {
            console.error(`Unknown type: ${type}. Valid: ${Object.keys(TYPE_DIRS).join(', ')}`)
            process.exit(1)
         }

         const knowledgeDir = findKnowledgeDir()
         const today = new Date().toISOString().slice(0, 10)
         const slug = slugify(title)
         const tags = opts.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .join(', ')

         const content = renderTemplate(type, { date: today, slug, tags, title })
         const dir = path.join(knowledgeDir, TYPE_DIRS[type]!)
         mkdirSync(dir, { recursive: true })

         const outPath = path.join(dir, `${today}-${slug}.md`)
         if (existsSync(outPath)) {
            console.error(`Already exists: ${outPath}`)
            process.exit(1)
         }

         writeFileSync(outPath, content)
         console.log(outPath)
      })
}
