import {embedMany} from 'ai';
import {createOllama} from 'ollama-ai-provider-v2';
import type {EmbeddingConfig} from './config.ts';

export type EmbeddingProvider = {
	embed(texts: string[]): Promise<number[][]>;
};

export function getProvider(cfg: EmbeddingConfig): EmbeddingProvider | undefined {
	if (!cfg.enabled || !cfg.model) {
		return undefined;
	}

	const provider = createOllama({...(cfg.baseUrl ? {baseURL: cfg.baseUrl} : {})});
	const model = provider.embedding(cfg.model);
	return {
		async embed(texts) {
			const {embeddings} = await embedMany({model, values: texts});
			return embeddings;
		},
	};
}

export function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (const [i, ai] of a.entries()) {
		const bi = b[i] ?? 0;
		dot += ai * bi;
		normA += ai * ai;
		normB += bi * bi;
	}

	const denom = Math.sqrt(normA) * Math.sqrt(normB);
	return denom === 0 ? 0 : dot / denom;
}
