/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $languages = {
    type: 'array',
    contains: {
        properties: {
            code: {
                type: 'string',
                description: `Language code`,
            },
            name: {
                type: 'string',
                description: `Human-readable language name (in English)`,
            },
            targets: {
                type: 'array',
                contains: {
                    type: 'string',
                },
            },
        },
    },
} as const;
