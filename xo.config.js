/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	{
		ignores: ['docs/**', '.claude/**'],
	},
	{
		rules: {
			'no-restricted-imports': ['error', {
				paths: [
					{
						name: 'node:fs',
						importNames: ['readFile', 'readFileSync', 'writeFile', 'writeFileSync'],
						message: 'Use Bun.file().text() for reads and Bun.write() for writes instead.',
					},
					{
						name: 'node:fs/promises',
						importNames: ['readFile', 'writeFile'],
						message: 'Use Bun.file().text() for reads and Bun.write() for writes instead.',
					},
				],
			}],
			'unicorn/no-process-exit': 'off',
			'unicorn/prevent-abbreviations': 'off',
			'n/prefer-global/process': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-unsafe-type-assertion': 'off',
			'unicorn/no-array-reduce': 'off',
			'unicorn/no-array-callback-reference': 'off',
			'@stylistic/curly-newline': 'off',
		},
	},
	// MCP SDK callback params come through as `any` due to Zod inference limits
	{
		files: ['**/mcp.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
		},
	},
];

export default xoConfig;
