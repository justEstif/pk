import {Command} from 'commander';
import pkg from '../package.json' with {type: 'json'};
import {registerNew} from './commands/new.ts';
import {registerSearch} from './commands/search.ts';
import {registerSynthesize} from './commands/synthesize.ts';
import {registerRebuild} from './commands/rebuild.ts';
import {registerLint} from './commands/lint.ts';
import {registerConfig} from './commands/config-cmd.ts';
import {registerInit} from './commands/init.ts';
import {registerInstructions} from './commands/instructions.ts';
import {registerVocab} from './commands/vocab.ts';
import {registerMcp} from './commands/mcp.ts';
import {registerPrime} from './commands/prime.ts';

const program = new Command()
	.name('pk')
	.description('Project knowledge — structured intake, search, and recall')
	.version(pkg.version);

registerNew(program);
registerSearch(program);
registerSynthesize(program);
registerRebuild(program);
registerLint(program);
registerConfig(program);
registerInit(program);
registerInstructions(program);
registerVocab(program);
registerMcp(program);
registerPrime(program);

program.parse();
