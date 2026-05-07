// Pure domain data — constants and types. No I/O.

export const TYPE_DIRS: Record<string, string> = {
	decision: 'decisions',
	index: 'indexes',
	note: 'notes',
	question: 'questions',
	source: 'sources',
};

export const STATUSES: Record<string, string[]> = {
	decision: ['proposed', 'accepted', 'superseded'],
	index: ['active', 'archived'],
	note: ['active', 'superseded', 'archived'],
	question: ['open', 'answered', 'obsolete'],
	source: ['unprocessed', 'processed', 'archived'],
};

export const REQUIRED_SECTIONS: Record<string, string[]> = {
	decision: ['Decision', 'Context', 'Rationale', 'Consequences', 'Related'],
	index: ['Purpose', 'Key Links', 'Open Questions', 'Recent Changes'],
	note: ['Summary', 'Details', 'Evidence', 'Related'],
	question: ['Question', 'Why It Matters', 'Current Understanding', 'Resolution'],
	source: ['Source', 'Raw Material', 'Extracted Items'],
};

export const LENGTH_WARN: Record<string, number> = {
	decision: 120,
	index: 200,
	note: 150,
	question: 80,
	source: 400,
};

export type NoteMeta = {
	[key: string]: string | string[] | undefined;
	created?: string;
	id?: string;
	status?: string;
	tags?: string[];
	title?: string;
	type?: string;
	updated?: string;
};

export type Note = {
	body: string;
	err?: string;
	meta: NoteMeta;
	path: string;
};
