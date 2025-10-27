/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $frontend_settings = {
    properties: {
        apiKeys: {
            type: 'boolean',
            description: `Whether the API key database is enabled.`,
        },
        charLimit: {
            type: 'number',
            description: `Character input limit for this language (-1 indicates no limit)`,
        },
        frontendTimeout: {
            type: 'number',
            description: `Frontend translation timeout`,
        },
        keyRequired: {
            type: 'boolean',
            description: `Whether an API key is required.`,
        },
        language: {
            properties: {
                source: {
                    properties: {
                        code: {
                            type: 'string',
                            description: `Language code`,
                        },
                        name: {
                            type: 'string',
                            description: `Human-readable language name (in English)`,
                        },
                    },
                },
                target: {
                    properties: {
                        code: {
                            type: 'string',
                            description: `Language code`,
                        },
                        name: {
                            type: 'string',
                            description: `Human-readable language name (in English)`,
                        },
                    },
                },
            },
        },
        suggestions: {
            type: 'boolean',
            description: `Whether submitting suggestions is enabled.`,
        },
        supportedFilesFormat: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
    },
} as const;
