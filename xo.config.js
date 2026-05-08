/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	{
		ignores: ['docs/**', '.claude/**', 'packages/**'],
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
];

export default xoConfig;
