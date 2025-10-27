/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $detections = {
    type: 'array',
    contains: {
        properties: {
            confidence: {
                type: 'number',
                description: `Confidence value`,
                format: 'integer',
                maximum: 100,
            },
            language: {
                type: 'string',
                description: `Language code`,
            },
        },
    },
} as const;
