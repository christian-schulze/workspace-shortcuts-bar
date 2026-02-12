export default [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                global: "readonly",
                log: "readonly",
                logError: "readonly",
                console: "readonly",
                ARGV: "readonly",
                imports: "readonly",
            },
        },
        rules: {
            "no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "no-undef": "error",
            semi: ["error", "always"],
            indent: ["error", 4],
            "no-trailing-spaces": "error",
            "eol-last": "error",
        },
    },
];
