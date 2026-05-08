import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {Command} from 'commander';
import {
	describe, test, expect, beforeEach, afterEach,
} from 'bun:test';
import {registerHistory} from './history.ts';

describe('history command', () => {
	let knowledgeDir: string;

	beforeEach(() => {
		// Create temp knowledge directory
		knowledgeDir = path.join(tmpdir(), `pk-test-${Date.now()}`);
		mkdirSync(knowledgeDir, {recursive: true});
	});

	afterEach(() => {
		// Cleanup temp directory
		rmSync(knowledgeDir, {recursive: true, force: true});
	});

	test('registerHistory registers the history command', () => {
		const program = new Command();
		registerHistory(program);

		const command = program.commands.find(c => c.name() === 'history');
		expect(command).toBeDefined();
	});

	test('history command has correct options', () => {
		const program = new Command();
		registerHistory(program);

		const command = program.commands.find(c => c.name() === 'history');
		expect(command).toBeDefined();

		const limitOption = command?.options.find(o => o.long === '--limit');
		expect(limitOption).toBeDefined();

		const typeOption = command?.options.find(o => o.long === '--type');
		expect(typeOption).toBeDefined();

		const filterTypeOption = command?.options.find(o => o.long === '--filter-type');
		expect(filterTypeOption).toBeDefined();

		const filterTagOption = command?.options.find(o => o.long === '--filter-tag');
		expect(filterTagOption).toBeDefined();

		const filterOperationOption = command?.options.find(o => o.long === '--filter-operation');
		expect(filterOperationOption).toBeDefined();
	});
});
