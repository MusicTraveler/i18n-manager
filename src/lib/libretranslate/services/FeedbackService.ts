/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { suggest_response } from '../models/suggest_response';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class FeedbackService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Submit a suggestion to improve a translation
     * @returns suggest_response Success
     * @throws ApiError
     */
    public postSuggest({
        q,
        s,
        source,
        target,
    }: {
        /**
         * Original text
         */
        q: string,
        /**
         * Suggested translation
         */
        s: string,
        /**
         * Language of original text
         */
        source: string,
        /**
         * Language of suggested translation
         */
        target: string,
    }): CancelablePromise<suggest_response> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/suggest',
            formData: {
                'q': q,
                's': s,
                'source': source,
                'target': target,
            },
            errors: {
                403: `Not authorized`,
            },
        });
    }
}
