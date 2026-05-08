import {mkdirSync} from 'node:fs';
import path from 'node:path';

// ─── MCP utilities ────────────────────────────────────────────────────────────

export type McpEntry = {
	command: string;
	args: string[];
	env: Record<string, string>;
};

export function resolvePkCommand(): string {
	return Bun.which('pk') ?? 'pk';
}

export function pkMcpEntry(knowledgeDir: string): McpEntry {
	return {
		args: ['mcp'],
		command: resolvePkCommand(),
		env: {PK_KNOWLEDGE_DIR: knowledgeDir},
	};
}

export async function readJson(filePath: string): Promise<Record<string, unknown>> {
	try {
		return JSON.parse(await Bun.file(filePath).text()) as Record<string, unknown>;
	} catch {
		return {};
	}
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
	mkdirSync(path.dirname(filePath), {recursive: true});
	await Bun.write(filePath, JSON.stringify(data, null, 2) + '\n');
}

// ─── Instruction file writers ─────────────────────────────────────────────────

export const PK_SECTION_START = '<!-- pk:start -->';
export const PK_SECTION_END = '<!-- pk:end -->';

export const PK_INSTRUCTION = `\
## pk — project knowledge

Use the pk skill and its MCP tools (pk_synthesize, pk_search, pk_read, pk_new, pk_lint) \
to manage project knowledge for this project. \
Run pk_synthesize({ sessionStart: true }) at the start of every session.`;

export async function writeInstructionSection(filePath: string, content: string): Promise<void> {
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

export async function writeClaudeMd(projectRoot: string): Promise<void> {
	await writeInstructionSection(path.join(projectRoot, 'CLAUDE.md'), PK_INSTRUCTION);
}

export async function writeAgentsMd(projectRoot: string): Promise<void> {
	await writeInstructionSection(path.join(projectRoot, 'AGENTS.md'), PK_INSTRUCTION);
}

// ─── Shared constants ─────────────────────────────────────────────────────────

export const FORCED_EVAL_PROMPT = 'SKILL EVALUATION REQUIRED: Before responding, explicitly decide YES or NO'
	+ ' — does this request involve project work, investigation, decisions, or knowledge capture'
	+ ' where the pk skill applies? If YES, activate the pk skill, then proceed.';
