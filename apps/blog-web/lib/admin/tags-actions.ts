'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { CreateTagDto, UpdateTagDto } from '@repo/shared'

import { apiClient } from '../api-client'
import { getAuthorizationToken, handleServerAuthError } from '../auth'
import { ApiError, ReauthenticationRequiredError } from '../api-errors'

async function requireTokenOrRedirect(returnTo: string): Promise<string> {
  const token = await getAuthorizationToken()
  if (token) {
    return token
  }
  handleServerAuthError(
    new ReauthenticationRequiredError(401, '세션 정보가 만료되었어요. 다시 로그인해 주세요.'),
    { returnTo }
  )
}

export async function createAdminTag(
  payload: CreateTagDto
): Promise<{ success: boolean; error?: string }> {
  const token = await requireTokenOrRedirect('/admin/tags')

  try {
    const response = await apiClient.tags.createTag(payload, { token })
    revalidatePath('/admin/tags')
    if (response?.success && response.data) {
      return { success: true }
    }
    return { success: false, error: '태그 생성에 실패했어요.' }
  } catch (error: unknown) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/tags' })
    }
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '태그 생성 중 오류가 발생했어요.'
    return { success: false, error: message }
  }
}

export async function updateAdminTag(
  slug: string,
  payload: UpdateTagDto
): Promise<{ success: boolean; error?: string }> {
  const token = await requireTokenOrRedirect('/admin/tags')

  try {
    const response = await apiClient.tags.updateTag(slug, payload, { token })
    revalidatePath('/admin/tags')
    revalidatePath(`/admin/tags/${slug}`)
    if (response?.success && response.data) {
      return { success: true }
    }
    return { success: false, error: '태그 수정에 실패했어요.' }
  } catch (error: unknown) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/tags' })
    }
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '태그 수정 중 오류가 발생했어요.'
    return { success: false, error: message }
  }
}

export async function deleteAdminTag(
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const token = await requireTokenOrRedirect('/admin/tags')

  try {
    await apiClient.tags.deleteTag(slug, { token })
    revalidatePath('/admin/tags')
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/tags' })
    }
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '태그 삭제 중 오류가 발생했어요.'
    return { success: false, error: message }
  }
}

function parseString(value: FormDataEntryValue | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function createAdminTagAction(
  _prevState: { success: boolean; error?: string },
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const payload: CreateTagDto = {
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
  }

  return await createAdminTag(payload)
}

export async function updateAdminTagAction(
  _prevState: { success: boolean; error?: string },
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const slug = parseString(formData.get('slug'))
  if (!slug) {
    return { success: false, error: '수정할 태그의 slug가 필요합니다.' }
  }

  const payload: UpdateTagDto = {
    name: parseString(formData.get('name')),
    slug: parseString(formData.get('nextSlug')),
  }

  return await updateAdminTag(slug, payload)
}

export async function deleteAdminTagAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const slug = parseString(formData.get('slug'))
  if (!slug) {
    return { success: false, error: '삭제할 태그의 slug가 필요합니다.' }
  }

  return await deleteAdminTag(slug)
}
