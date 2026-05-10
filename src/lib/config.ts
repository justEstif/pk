import {mkdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export type EmbeddingConfig = {
	enabled: boolean;
	provider: 'local' | null;
	model: string | null;
};

export type Config = {
	embedding: EmbeddingConfig;
};

const defaultConfig: Config = {
	embedding: {
		enabled: false,
		provider: null,
		model: null,
	},
};

function configPath(): string {
	return path.join(os.homedir(), '.pk', 'config.json');
}

function parseConfigJson(text: string): Partial<Config> & {embedding?: unknown} {
	const parsed: unknown = JSON.parse(text);
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return {};
	}

	return parsed;
}

function isEmbeddingConfigPartial(value: unknown): value is Partial<EmbeddingConfig> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		(record.enabled === undefined || typeof record.enabled === 'boolean')
		&& (record.provider === undefined || record.provider === 'local' || record.provider === null)
		&& (record.model === undefined || typeof record.model === 'string' || record.model === null)
	);
}

export async function loadConfig(): Promise<Config> {
	const p = configPath();
	try {
		const text = await Bun.file(p).text();
		const parsed = parseConfigJson(text);

		// Backward compatibility for pre-embedding configs: {"embedding":"model"}.
		if (typeof parsed.embedding === 'string') {
			return {
				...defaultConfig,
				embedding: parsed.embedding
					? {enabled: true, provider: 'local', model: parsed.embedding}
					: defaultConfig.embedding,
			};
		}

		if (isEmbeddingConfigPartial(parsed.embedding)) {
			return {
				...defaultConfig,
				...parsed,
				embedding: {
					...defaultConfig.embedding,
					...parsed.embedding,
				},
			};
		}

		return {
			...defaultConfig,
			...parsed,
			embedding: defaultConfig.embedding,
		};
	} catch {
		return {...defaultConfig};
	}
}

export async function saveConfig(config: Config): Promise<void> {
	const p = configPath();
	mkdirSync(path.dirname(p), {recursive: true});
	await Bun.write(p, JSON.stringify(config, null, 2) + '\n');
}
