import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Issue, IssueLevel } from './lint.ts'
import {
   checkRequiredFields,
   checkTypeAndLocation,
   checkRequiredSections,
   checkTags,
   checkSourceExtracted,
   checkLength,
   lintNotes,
} from './lint.ts'

const P = '/knowledge/notes/2024-01-01-test.md'

// helper: wraps issues array so IssueLevel and Issue types are used explicitly
function issuesOf(level: IssueLevel, items: Issue[]): Issue[] {
   return items.filter((i) => i.level === level)
}
void issuesOf

// ---------------------------------------------------------------------------
// checkRequiredFields
// ---------------------------------------------------------------------------

describe('checkRequiredFields', () => {
   const full = {
      id: 'abc', type: 'note', title: 'T', created: '2024-01-01',
      updated: '2024-01-01', status: 'active', tags: ['x'],
   }

   test('returns no issues for a complete meta object', () => {
      expect(checkRequiredFields(full, P)).toEqual([])
   })

   test('flags each missing required field as an error', () => {
      const issues = checkRequiredFields({}, P)
      const fields = issues.map((i) => i.message.replace('missing frontmatter field: ', ''))
      expect(fields.sort()).toEqual(['created', 'id', 'status', 'tags', 'title', 'type', 'updated'])
      expect(issues.every((i) => i.level === 'error')).toBe(true)
   })

   test('flags empty-string values as missing', () => {
      const issues = checkRequiredFields({ ...full, title: '' }, P)
      expect(issues).toHaveLength(1)
      expect(issues[0]?.message).toContain('title')
   })

   test('attaches the provided path to every issue', () => {
      const issues = checkRequiredFields({}, P)
      expect(issues.every((i) => i.path === P)).toBe(true)
   })
})

// ---------------------------------------------------------------------------
// checkTypeAndLocation
// ---------------------------------------------------------------------------

describe('checkTypeAndLocation', () => {
   const knowledgeDir = '/knowledge'

   test('returns no issues when type, status, and location are all valid', () => {
      const meta = { type: 'note', status: 'active' }
      // file lives exactly in /knowledge/notes/
      const p = '/knowledge/notes/2024-01-01-my-note.md'
      expect(checkTypeAndLocation(meta, p, knowledgeDir)).toEqual([])
   })

   test('flags invalid status for the given type', () => {
      const meta = { type: 'note', status: 'proposed' }  // 'proposed' is decision-only
      const p = '/knowledge/notes/2024-01-01-my-note.md'
      const issues = checkTypeAndLocation(meta, p, knowledgeDir)
      expect(issues.some((i) => i.message.includes('invalid status'))).toBe(true)
   })

   test('flags a file stored in the wrong directory', () => {
      const meta = { type: 'note', status: 'active' }
      const p = '/knowledge/decisions/2024-01-01-wrong-place.md'  // should be in notes/
      const issues = checkTypeAndLocation(meta, p, knowledgeDir)
      expect(issues.some((i) => i.message.includes('must live in'))).toBe(true)
   })
})

// ---------------------------------------------------------------------------
// checkRequiredSections
// ---------------------------------------------------------------------------

describe('checkRequiredSections', () => {
   test('returns no issues when all required sections are present', () => {
      const body = '## Summary\n\ntext\n\n## Details\n\nmore\n\n## Evidence\n\n.\n\n## Related\n\n.\n'
      expect(checkRequiredSections(body, 'note', P)).toEqual([])
   })

   test('flags each missing required section as an error', () => {
      const body = '## Summary\n\ntext\n'  // missing Details, Evidence, Related
      const issues = checkRequiredSections(body, 'note', P)
      expect(issues.length).toBe(3)
      expect(issues.every((i) => i.level === 'error')).toBe(true)
      expect(issues.every((i) => i.message.startsWith('missing section:'))).toBe(true)
   })

   test('returns no issues for a type with no required sections', () => {
      // There is no type with empty required sections, but an unknown type produces []
      expect(checkRequiredSections('anything', 'unknown_type', P)).toEqual([])
   })
})

// ---------------------------------------------------------------------------
// checkTags
// ---------------------------------------------------------------------------

describe('checkTags', () => {
   test('returns no issues for a non-empty array', () => {
      expect(checkTags(['engineering', 'architecture'], P)).toEqual([])
   })

   test('returns a warn issue for an empty array', () => {
      const issues = checkTags([], P)
      expect(issues).toHaveLength(1)
      expect(issues[0]?.level).toBe('warn')
      expect(issues[0]?.message).toContain('tags is empty')
   })

   test('returns an error issue when tags is not an array', () => {
      const issues = checkTags('not-an-array', P)
      expect(issues).toHaveLength(1)
      expect(issues[0]?.level).toBe('error')
      expect(issues[0]?.message).toContain('flat list')
   })

   test('returns an error issue when tags is undefined', () => {
      const issues = checkTags(undefined, P)
      expect(issues[0]?.level).toBe('error')
   })
})

// ---------------------------------------------------------------------------
// checkSourceExtracted
// ---------------------------------------------------------------------------

describe('checkSourceExtracted', () => {
   test('returns no issues for a non-source note', () => {
      expect(checkSourceExtracted('anything', { type: 'note', status: 'active' }, P)).toEqual([])
   })

   test('returns no issues for an unprocessed source', () => {
      const body = '## Extracted Items\n\n'
      expect(checkSourceExtracted(body, { type: 'source', status: 'unprocessed' }, P)).toEqual([])
   })

   test('returns no issues for a processed source with content in Extracted Items', () => {
      const body = '## Extracted Items\n\n- [[some-note]]\n'
      expect(checkSourceExtracted(body, { type: 'source', status: 'processed' }, P)).toEqual([])
   })

   test('returns a warn issue for a processed source with empty Extracted Items', () => {
      const body = '## Extracted Items\n\n'
      const issues = checkSourceExtracted(body, { type: 'source', status: 'processed' }, P)
      expect(issues).toHaveLength(1)
      expect(issues[0]?.level).toBe('warn')
      expect(issues[0]?.message).toContain('empty Extracted Items')
   })

   test('returns a warn issue when Extracted Items section exists but only whitespace', () => {
      const body = '## Extracted Items\n\n   \n'
      const issues = checkSourceExtracted(body, { type: 'source', status: 'processed' }, P)
      expect(issues).toHaveLength(1)
      expect(issues[0]?.level).toBe('warn')
   })
})

// ---------------------------------------------------------------------------
// checkLength (needs real files)
// ---------------------------------------------------------------------------

describe('checkLength', () => {
  function makeTmpFile(content: string): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'pk-test-'))
    const file = path.join(dir, 'note.md')
    writeFileSync(file, content)
    return file
  }

  test('returns no issues for a note within the line threshold', () => {
    const content = Array(50).fill('line').join('\n')
    const file = makeTmpFile(content)
    expect(checkLength(file, 'note')).toEqual([])
    rmSync(path.dirname(file), { recursive: true })
  })

  test('returns a warn issue when line count exceeds the type threshold', () => {
    const content = Array(160).fill('line').join('\n')  // note threshold is 150
    const file = makeTmpFile(content)
    const issues = checkLength(file, 'note')
    expect(issues.some((i) => i.level === 'warn' && i.message.includes('exceeds'))).toBe(true)
    rmSync(path.dirname(file), { recursive: true })
  })

  test('returns an error issue when a non-source note exceeds 400 lines', () => {
    const content = Array(410).fill('line').join('\n')
    const file = makeTmpFile(content)
    const issues = checkLength(file, 'note')
    expect(issues.some((i) => i.level === 'error' && i.message.includes('400 lines'))).toBe(true)
    rmSync(path.dirname(file), { recursive: true })
  })

  test('does not error for a source note exceeding 400 lines', () => {
    const content = Array(410).fill('line').join('\n')
    const file = makeTmpFile(content)
    const issues = checkLength(file, 'source')
    expect(issues.every((i) => i.level !== 'error')).toBe(true)
    rmSync(path.dirname(file), { recursive: true })
  })
})

// ---------------------------------------------------------------------------
// lintNotes (integration: real knowledge directory)
// ---------------------------------------------------------------------------

describe('lintNotes', () => {
  function makeKnowledgeDir(notes: Array<{ subdir: string; name: string; content: string }>): string {
    const root = mkdtempSync(path.join(tmpdir(), 'pk-knowledge-'))
    for (const { subdir, name, content } of notes) {
      const dir = path.join(root, subdir)
      mkdirSync(dir, { recursive: true })
      writeFileSync(path.join(dir, name), content)
    }
    return root
  }

  const VALID_NOTE = `---
id: note-2024-01-01-test
type: note
title: Test Note
created: 2024-01-01
updated: 2024-01-01
status: active
tags: [testing]
---

## Summary

A short summary.

## Details

Some details.

## Evidence

No evidence.

## Related

None.
`

  test('returns no issues for a valid note', () => {
    const root = makeKnowledgeDir([{ subdir: 'notes', name: '2024-01-01-test.md', content: VALID_NOTE }])
    const { issues } = lintNotes(root)
    rmSync(root, { recursive: true })
    expect(issues).toEqual([])
  })

  test('flags a note with missing required fields', () => {
    const content = `---
id: note-2024-01-01-x
type: note
title: Missing Fields
created: 2024-01-01
updated: 2024-01-01
---

## Summary

text.

## Details

d.

## Evidence

e.

## Related

r.
`
    const root = makeKnowledgeDir([{ subdir: 'notes', name: '2024-01-01-x.md', content }])
    const { issues } = lintNotes(root)
    rmSync(root, { recursive: true })
    expect(issues.some((i) => i.message.includes('status'))).toBe(true)
    expect(issues.some((i) => i.message.includes('tags'))).toBe(true)
  })

  test('flags a note stored in the wrong directory', () => {
    const root = makeKnowledgeDir([
      // valid note dirs require notes/ to live in notes/, decisions in decisions/, etc.
      { subdir: 'decisions', name: '2024-01-01-misplaced.md', content: VALID_NOTE },
    ])
    const { issues } = lintNotes(root)
    rmSync(root, { recursive: true })
    expect(issues.some((i) => i.message.includes('must live in'))).toBe(true)
  })

  test('reports noteCount matching number of files scanned', () => {
    const root = makeKnowledgeDir([
      { subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE },
      { subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE },
    ])
    const { noteCount } = lintNotes(root)
    rmSync(root, { recursive: true })
    expect(noteCount).toBe(2)
  })

  test('flags a note with a duplicate id', () => {
    const root = makeKnowledgeDir([
      { subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE },
      { subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE },  // same id
    ])
    const { issues } = lintNotes(root)
    rmSync(root, { recursive: true })
    expect(issues.some((i) => i.message.startsWith('duplicate id'))).toBe(true)
  })
})
