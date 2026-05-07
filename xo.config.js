/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	{
		rules: {
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
