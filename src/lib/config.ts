import {mkdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {z} from 'zod';

const embeddingConfigSchema = z.object({
	enabled: z.boolean().default(false),
	model: z.string().nullable().default(null),
	baseUrl: z.string().optional(),
});

export type EmbeddingConfig = z.infer<typeof embeddingConfigSchema>;

const configSchema = z.object({
	embedding: embeddingConfigSchema.default({enabled: false, model: null}),
});

export type Config = z.infer<typeof configSchema>;

const defaultConfig: Config = configSchema.parse({});

function configPath(): string {
	return path.join(os.homedir(), '.pk', 'config.json');
}

export async function loadConfig(): Promise<Config> {
	const p = configPath();
	try {
		const text = await Bun.file(p).text();
		return configSchema.parse(JSON.parse(text));
	} catch {
		return {...defaultConfig};
	}
}

export async function saveConfig(config: Config): Promise<void> {
	const p = configPath();
	mkdirSync(path.dirname(p), {recursive: true});
	await Bun.write(p, JSON.stringify(config, null, 2) + '\n');
}
