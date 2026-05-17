import {createRequire} from 'node:module';
import {Command} from 'commander';
import {registerNew} from './commands/new.ts';
import {registerDelete} from './commands/delete.ts';
import {registerSearch} from './commands/search.ts';
import {registerHistory} from './commands/history.ts';
import {registerSynthesize} from './commands/synthesize.ts';
import {registerRebuild} from './commands/rebuild.ts';
import {registerLint} from './commands/lint.ts';
import {registerConfig} from './commands/config-cmd.ts';
import {registerInit} from './commands/init.ts';
import {registerInstructions} from './commands/instructions.ts';
import {registerVocab} from './commands/vocab.ts';
import {registerPrime} from './commands/prime.ts';
import {registerRead} from './commands/read.ts';
import {registerWrite} from './commands/write.ts';
import {registerUse} from './commands/use.ts';
import {registerProjects} from './commands/projects.ts';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as {version: string};

const program = new Command()
	.name('pk')
	.description('Project knowledge — structured intake, search, and recall')
	.version(pkg.version);

registerNew(program);
registerDelete(program);
registerSearch(program);
registerHistory(program);
registerSynthesize(program);
registerRebuild(program);
registerLint(program);
registerConfig(program);
registerInit(program);
registerInstructions(program);
registerVocab(program);
registerPrime(program);
registerRead(program);
registerWrite(program);
registerUse(program);
registerProjects(program);
program.parse();
