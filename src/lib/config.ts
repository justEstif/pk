import {mkdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {z} from 'zod';

export const EmbeddingConfigSchema = z.object({
	enabled: z.boolean().default(false),
	model: z.string().nullable().default(null),
	baseUrl: z.string().optional(),
});

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

export const ConfigSchema = z.object({
	embedding: EmbeddingConfigSchema.default({enabled: false, model: null}),
});

export type Config = z.infer<typeof ConfigSchema>;

const defaultConfig: Config = ConfigSchema.parse({});

function configPath(): string {
	return path.join(os.homedir(), '.pk', 'config.json');
}

export async function loadConfig(): Promise<Config> {
	const p = configPath();
	try {
		const text = await Bun.file(p).text();
		const raw: unknown = JSON.parse(text);

		// Backward compat: {"embedding": "model-name"} → structured config.
		if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
			const obj = raw as Record<string, unknown>;
			if (typeof obj.embedding === 'string') {
				obj.embedding = obj.embedding ? {enabled: true, model: obj.embedding} : {};
			}
		}

		return ConfigSchema.parse(raw);
	} catch {
		return {...defaultConfig};
	}
}

export async function saveConfig(config: Config): Promise<void> {
	const p = configPath();
	mkdirSync(path.dirname(p), {recursive: true});
	await Bun.write(p, JSON.stringify(config, null, 2) + '\n');
}
