import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {pkInstruction} from '../../lib/instruction.ts';

const PK_SECTION_START = '<!-- pk:start -->';
const PK_SECTION_END = '<!-- pk:end -->';

async function writeInstructionSection(filePath: string, content: string): Promise<void> {
	const section = `${PK_SECTION_START}\n${content}\n${PK_SECTION_END}\n`;
	let existing = '';
	try {
		existing = await Bun.file(filePath).text();
	} catch {}

	const startIdx = existing.indexOf(PK_SECTION_START);
	const endIdx = existing.indexOf(PK_SECTION_END);
	let updated: string;
	if (startIdx !== -1 && endIdx !== -1) {
		updated = existing.slice(0, startIdx) + section + existing.slice(endIdx + PK_SECTION_END.length + 1);
	} else {
		updated = existing ? existing.trimEnd() + '\n\n' + section : section;
	}

	mkdirSync(path.dirname(filePath), {recursive: true});
	await Bun.write(filePath, updated);
}

export async function writeAgentsMd(projectRoot: string, knowledgeDir: string): Promise<void> {
	await writeInstructionSection(path.join(projectRoot, 'AGENTS.md'), pkInstruction(knowledgeDir));
}
