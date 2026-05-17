export function pkInstruction(knowledgeDir: string): string {
	const backtick = '`';
	return `\
## pk — project knowledge

Use the pk skill and its CLI commands to manage project knowledge for this project. \
Run ${backtick}pk synthesize --session-start${backtick} at the start of every session.

Knowledge directory: ${backtick}${knowledgeDir}${backtick}

If a pk command fails with "No pk project found", prefix it with the knowledge directory: \
${backtick}PK_KNOWLEDGE_DIR=${knowledgeDir} pk <command>${backtick}.
`;
}

export const FORCED_EVAL_PROMPT
	= 'SKILL EVALUATION REQUIRED: Before responding, explicitly decide YES or NO'
		+ ' — does this request involve project work, investigation, decisions, or knowledge capture'
		+ ' where the pk skill applies? If YES, activate the pk skill, then proceed.';
