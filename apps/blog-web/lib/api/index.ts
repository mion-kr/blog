import type { ApiResponse } from '@repo/shared';

import {
  ApiRequestOptions,
  buildQueryParams,
  ensureAuthToken,
  isErrorResponse,
  isSuccessResponse,
  request,
} from './base-client';
import { categoriesApi } from './categories';
import { postsApi } from './posts';
import { settingsApi } from './settings';
import { tagsApi } from './tags';
import { uploadsApi } from './uploads';

function get<T>(endpoint: string, options: ApiRequestOptions = {}) {
  return request<T>(endpoint, { ...options, method: 'GET' });
}

function post<T>(
  endpoint: string,
  body: unknown,
  options: ApiRequestOptions,
) {
  ensureAuthToken(options.token, `POST ${endpoint}`);
  return request<T>(endpoint, { ...options, method: 'POST', body });
}

function put<T>(endpoint: string, body: unknown, options: ApiRequestOptions) {
  ensureAuthToken(options.token, `PUT ${endpoint}`);
  return request<T>(endpoint, { ...options, method: 'PUT', body });
}

function destroy<T>(endpoint: string, options: ApiRequestOptions) {
  ensureAuthToken(options.token, `DELETE ${endpoint}`);
  return request<T>(endpoint, { ...options, method: 'DELETE' });
}

export const apiClient = {
  request,
  get,
  post,
  put,
  delete: destroy,
  withToken(token: string) {
    return {
      request: <T>(endpoint: string, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token }),
      get: <T>(endpoint: string, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token, method: 'GET' }),
      post: <T>(endpoint: string, body: unknown, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token, method: 'POST', body }),
      put: <T>(endpoint: string, body: unknown, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token, method: 'PUT', body }),
      delete: <T>(endpoint: string, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token, method: 'DELETE' }),
    };
  },
  posts: postsApi,
  categories: categoriesApi,
  tags: tagsApi,
  settings: settingsApi,
  uploads: uploadsApi,
};

export type { ApiRequestOptions };
export {
  buildQueryParams,
  ensureAuthToken,
  isErrorResponse,
  isSuccessResponse,
  request,
};
export { categoriesApi, postsApi, tagsApi, settingsApi, uploadsApi };
export type { ApiResponse };
