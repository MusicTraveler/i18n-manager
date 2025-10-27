/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { FeedbackService } from './services/FeedbackService';
import { FrontendService } from './services/FrontendService';
import { TranslateService } from './services/TranslateService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class LibreTranslateClient {
    public readonly feedback: FeedbackService;
    public readonly frontend: FrontendService;
    public readonly translate: TranslateService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? '',
            VERSION: config?.VERSION ?? '?',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.feedback = new FeedbackService(this.request);
        this.frontend = new FrontendService(this.request);
        this.translate = new TranslateService(this.request);
    }
}

