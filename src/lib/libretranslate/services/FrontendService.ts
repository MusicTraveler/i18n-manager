/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { frontend_settings } from '../models/frontend_settings';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class FrontendService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Retrieve frontend specific settings
     * @returns frontend_settings frontend settings
     * @throws ApiError
     */
    public getFrontendSettings(): CancelablePromise<frontend_settings> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/frontend/settings',
        });
    }
}
