module.exports = {
	testEnvironment: 'node',
	transform: {
		'^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/../../tsconfig.json' }],
	},
	roots: ['<rootDir>'],
	testMatch: ['**/*.spec.ts'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
};
