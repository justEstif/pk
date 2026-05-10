import {mkdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export type Config = {
	embedding: string;
};

const DEFAULT: Config = {embedding: ''};

function configPath(): string {
	return path.join(os.homedir(), '.pk', 'config.json');
}

export async function loadConfig(): Promise<Config> {
	const p = configPath();
	try {
		const text = await Bun.file(p).text();
		const merged: Config = {...DEFAULT, ...JSON.parse(text) as Partial<Config>};
		return merged;
	} catch {
		return {...DEFAULT};
	}
}

export async function saveConfig(config: Config): Promise<void> {
	const p = configPath();
	mkdirSync(path.dirname(p), {recursive: true});
	await Bun.write(p, JSON.stringify(config, null, 2) + '\n');
}
