import { Command } from 'commander'
import { registerNew } from './commands/new.ts'
import { registerSearch } from './commands/search.ts'
import { registerSynthesize } from './commands/synthesize.ts'
import { registerRebuild } from './commands/rebuild.ts'
import { registerLint } from './commands/lint.ts'
import { registerConfig } from './commands/config-cmd.ts'
import { registerInit } from './commands/init.ts'
import { registerInstructions } from './commands/instructions.ts'

const program = new Command()
  .name('pk')
  .description('Project knowledge — structured intake, search, and recall')
  .version('0.1.0')

registerNew(program)
registerSearch(program)
registerSynthesize(program)
registerRebuild(program)
registerLint(program)
registerConfig(program)
registerInit(program)
registerInstructions(program)

program.parse()
