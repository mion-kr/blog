'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { CreateCategoryDto, UpdateCategoryDto } from '@repo/shared'

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

export async function createAdminCategory(payload: CreateCategoryDto): Promise<void> {
  const token = await requireTokenOrRedirect('/admin/categories/new')

  try {
    const response = await apiClient.categories.createCategory(payload, { token })
    revalidatePath('/admin/categories')
    if (response?.success && response.data) {
      redirect(`/admin/categories/${response.data.slug}/edit?status=created`)
    }
  } catch (error: unknown) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/categories/new' })
    }
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '카테고리 생성 중 오류가 발생했어요.'
    redirect(`/admin/categories/new?status=error&message=${encodeURIComponent(message)}`)
  }
}

export async function updateAdminCategory(slug: string, payload: UpdateCategoryDto): Promise<void> {
  const token = await requireTokenOrRedirect(`/admin/categories/${slug}/edit`)

  try {
    const response = await apiClient.categories.updateCategory(slug, payload, { token })
    revalidatePath('/admin/categories')
    revalidatePath(`/admin/categories/${slug}`)
    if (response?.success && response.data) {
      redirect(`/admin/categories/${response.data.slug}/edit?status=updated`)
    }
  } catch (error: unknown) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: `/admin/categories/${slug}/edit` })
    }
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '카테고리 수정 중 오류가 발생했어요.'
    redirect(`/admin/categories/${slug}/edit?status=error&message=${encodeURIComponent(message)}`)
  }
}

export async function deleteAdminCategory(slug: string): Promise<void> {
  const token = await requireTokenOrRedirect('/admin/categories')

  try {
    await apiClient.categories.deleteCategory(slug, { token })
    revalidatePath('/admin/categories')
    redirect('/admin/categories?status=deleted')
  } catch (error: unknown) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/categories' })
    }
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '카테고리 삭제 중 오류가 발생했어요.'
    redirect(`/admin/categories?status=error&message=${encodeURIComponent(message)}`)
  }
}

function parseString(value: FormDataEntryValue | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function createAdminCategoryAction(formData: FormData) {
  const payload: CreateCategoryDto = {
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    description: parseString(formData.get('description')),
    color: parseString(formData.get('color')),
  }

  await createAdminCategory(payload)
}

export async function updateAdminCategoryAction(formData: FormData) {
  const slug = parseString(formData.get('slug'))
  if (!slug) {
    throw new Error('수정할 카테고리의 slug가 필요합니다.')
  }

  const payload: UpdateCategoryDto = {
    name: parseString(formData.get('name')),
    slug: parseString(formData.get('nextSlug')),
    description: parseString(formData.get('description')),
    color: parseString(formData.get('color')),
  }

  await updateAdminCategory(slug, payload)
}

export async function deleteAdminCategoryAction(formData: FormData) {
  const slug = parseString(formData.get('slug'))
  if (!slug) {
    throw new Error('삭제할 카테고리의 slug가 필요합니다.')
  }

  await deleteAdminCategory(slug)
}
