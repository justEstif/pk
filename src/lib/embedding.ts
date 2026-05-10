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
