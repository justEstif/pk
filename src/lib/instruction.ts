export function pkInstruction(knowledgeDir: string): string {
   return `\
## pk — project knowledge

Use the pk skill and its CLI commands to manage project knowledge for this project. \
Run \`pk synthesize --session-start\` at the start of every session.

Knowledge directory: \`${knowledgeDir}\`

If a pk command fails with "No .pk/config.json found", prefix it with the knowledge directory: \
\`PK_KNOWLEDGE_DIR=${knowledgeDir} pk <command>\``;
}

export const FORCED_EVAL_PROMPT = 'SKILL EVALUATION REQUIRED: Before responding, explicitly decide YES or NO'
   + ' — does this request involve project work, investigation, decisions, or knowledge capture'
   + ' where the pk skill applies? If YES, activate the pk skill, then proceed.';
