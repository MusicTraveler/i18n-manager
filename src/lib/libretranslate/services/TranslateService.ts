/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { detections } from '../models/detections';
import type { languages } from '../models/languages';
import type { translate } from '../models/translate';
import type { translate_file } from '../models/translate_file';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class TranslateService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Detect the language of a single text
     * @returns detections Detections
     * @throws ApiError
     */
    public postDetect({
        q,
        apiKey,
    }: {
        /**
         * Text to detect
         */
        q: string,
        /**
         * API key
         */
        apiKey?: string,
    }): CancelablePromise<detections> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/detect',
            formData: {
                'q': q,
                'api_key': apiKey,
            },
            errors: {
                400: `Invalid request`,
                403: `Banned`,
                429: `Slow down`,
                500: `Detection error`,
            },
        });
    }
    /**
     * Retrieve list of supported languages
     * @returns languages List of languages
     * @throws ApiError
     */
    public getLanguages(): CancelablePromise<languages> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/languages',
        });
    }
    /**
     * Translate text from a language to another
     * @returns translate Translated text
     * @throws ApiError
     */
    public postTranslate({
        q,
        source,
        target,
        format,
        alternatives,
        apiKey,
    }: {
        /**
         * Text(s) to translate
         */
        q: any,
        /**
         * Source language code
         */
        source: string,
        /**
         * Target language code
         */
        target: string,
        /**
         * Format of source text:
         * * `text` - Plain text
         * * `html` - HTML markup
         *
         */
        format?: 'text' | 'html',
        /**
         * Preferred number of alternative translations
         */
        alternatives?: number,
        /**
         * API key
         */
        apiKey?: string,
    }): CancelablePromise<translate> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/translate',
            formData: {
                'q': q,
                'source': source,
                'target': target,
                'format': format,
                'alternatives': alternatives,
                'api_key': apiKey,
            },
            errors: {
                400: `Invalid request`,
                403: `Banned`,
                429: `Slow down`,
                500: `Translation error`,
            },
        });
    }
    /**
     * Translate file from a language to another
     * @returns translate_file Translated file
     * @throws ApiError
     */
    public postTranslateFile({
        file,
        source,
        target,
        apiKey,
    }: {
        /**
         * File to translate
         */
        file: Blob,
        /**
         * Source language code
         */
        source: string,
        /**
         * Target language code
         */
        target: string,
        /**
         * API key
         */
        apiKey?: string,
    }): CancelablePromise<translate_file> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/translate_file',
            formData: {
                'file': file,
                'source': source,
                'target': target,
                'api_key': apiKey,
            },
            errors: {
                400: `Invalid request`,
                403: `Banned`,
                429: `Slow down`,
                500: `Translation error`,
            },
        });
    }
}
