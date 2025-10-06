'use server'

import { revalidatePath } from 'next/cache'

import type { BlogSettings, UpdateBlogSettingsDto, ValidationError } from '@repo/shared'

import type { SettingsActionState } from './settings-types'

import { apiClient } from '../api-client'
import { getAuthorizationToken, handleServerAuthError } from '../auth'
import { ApiError, ReauthenticationRequiredError } from '../api-errors'

const SETTINGS_RETURN_PATH = '/admin/settings'

function extractValidationErrors(details: unknown): ValidationError[] | undefined {
  if (!details || typeof details !== 'object') {
    return undefined
  }

  const record = details as Record<string, unknown>
  const raw = record.validation ?? record.validationErrors

  if (!Array.isArray(raw)) {
    return undefined
  }

  const normalized = raw.filter(
    (item): item is ValidationError =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as ValidationError).field === 'string' &&
      typeof (item as ValidationError).message === 'string'
  )

  return normalized.length > 0 ? normalized : undefined
}

function buildFieldErrors(
  validationErrors: ValidationError[] | undefined
): Record<string, string[]> | undefined {
  if (!validationErrors || validationErrors.length === 0) {
    return undefined
  }

  return validationErrors.reduce<Record<string, string[]>>((acc, error) => {
    const key = error.field || 'global'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(error.message)
    return acc
  }, {})
}

async function requireTokenOrRedirect(): Promise<string> {
  const token = await getAuthorizationToken()
  if (token) {
    return token
  }

  handleServerAuthError(
    new ReauthenticationRequiredError(
      401,
      '세션 정보가 만료되었어요. 다시 로그인해 주세요.',
    ),
    { returnTo: SETTINGS_RETURN_PATH }
  )

  throw new ReauthenticationRequiredError(
    401,
    '세션 정보가 만료되었어요. 다시 로그인해 주세요.',
  )
}

function parseString(value: FormDataEntryValue | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : undefined
}

async function updateAdminSettings(
  payload: UpdateBlogSettingsDto
): Promise<SettingsActionState> {
  const token = await requireTokenOrRedirect()

  try {
    const response = await apiClient.settings.updateSettings(payload, { token })
    revalidatePath(SETTINGS_RETURN_PATH)

    if (response?.success && response.data) {
      return {
        success: true,
        message: response.message ?? '설정이 저장되었어요.',
      }
    }

    const validationErrors = extractValidationErrors(response?.error?.details)

    return {
      success: false,
      error: response?.message ?? '설정 저장에 실패했어요.',
      validationErrors,
      fieldErrors: buildFieldErrors(validationErrors),
    }
  } catch (error: unknown) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: SETTINGS_RETURN_PATH })
    }

    if (error instanceof ApiError) {
      const validationErrors = extractValidationErrors(error.details)

      return {
        success: false,
        error: error.message,
        validationErrors,
        fieldErrors: buildFieldErrors(validationErrors),
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '설정 저장 중 오류가 발생했어요.',
    }
  }
}

export async function updateAdminBlogInfoAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const payload: UpdateBlogSettingsDto = {
    siteTitle: parseString(formData.get('siteTitle')),
    siteDescription: parseString(formData.get('siteDescription')),
    siteUrl: parseString(formData.get('siteUrl')),
  }

  return updateAdminSettings(payload)
}

export async function updateAdminPostSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const postsPerPageRaw = parseString(formData.get('postsPerPage'))
  const postsPerPage = postsPerPageRaw ? Number(postsPerPageRaw) : undefined

  const payload: UpdateBlogSettingsDto = {
    postsPerPage,
  }

  return updateAdminSettings(payload)
}

export async function syncSettingsFromServer(): Promise<BlogSettings | undefined> {
  const token = await getAuthorizationToken()
  if (!token) {
    return undefined
  }

  const response = await apiClient.settings.getSettings({ token })
  return response.success ? response.data ?? undefined : undefined
}
