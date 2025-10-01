'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

import type { CreatePostDto, PostResponseDto, UpdatePostDto } from '@repo/shared'

import { apiClient } from '../api-client'
import { getAuthorizationToken, handleServerAuthError } from '../auth'
import { ApiError, ReauthenticationRequiredError } from '../api-errors'

// 서버 액션에서 JWT가 없을 때 재인증 플로우로 넘겨주는 헬퍼
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

export async function createAdminPost(
  payload: CreatePostDto
): Promise<void> {
  // 생성 페이지에서 호출되면 토큰이 없을 때 로그인 화면으로 안내
  const token = await requireTokenOrRedirect('/admin/posts/new')

  try {
    // 토큰을 헤더에 붙여 API 서버에 쓰기 요청
    const response = await apiClient.post<PostResponseDto>(
      '/api/posts',
      payload,
      { token }
    )

    // 목록과 관련 뷰 갱신
    revalidatePath('/admin/posts')
    if (response?.success && response.data) {
      redirect('/admin/posts?status=created')
    }

    const failureMessage = response?.message ?? '포스트 생성에 실패했어요.'
    redirect(`/admin/posts/new?status=error&message=${encodeURIComponent(failureMessage)}`)
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error
    }
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/posts/new' })
    }

    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했어요.'

    redirect(`/admin/posts/new?status=error&message=${encodeURIComponent(message)}`)
  }
}

export async function updateAdminPost(
  slug: string,
  payload: UpdatePostDto
): Promise<PostResponseDto> {
  const token = await requireTokenOrRedirect(`/admin/posts/${slug}/edit`)

  try {
    const response = await apiClient.put<PostResponseDto>(
      `/api/posts/${slug}`,
      payload,
      { token }
    )

    revalidatePath('/admin/posts')
    revalidatePath(`/admin/posts/${slug}`)
    if (response?.success && response.data) {
      return response.data
    }
  } catch (error: unknown) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: `/admin/posts/${slug}/edit` })
    }

    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했어요.'

    redirect(`/admin/posts/${slug}/edit?status=error&message=${encodeURIComponent(message)}`)
  }

  throw new Error('포스트 수정 결과를 가져오지 못했습니다.')
}

export async function deleteAdminPost(
  slug: string
): Promise<void> {
  const token = await requireTokenOrRedirect('/admin/posts')

  try {
    await apiClient.delete<null>(`/api/posts/${slug}`, { token })
    revalidatePath('/admin/posts')
    redirect('/admin/posts?status=deleted')
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error
    }
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/posts' })
    }

    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '삭제 중 오류가 발생했어요.'

    redirect(`/admin/posts?status=error&message=${encodeURIComponent(message)}`)
  }
}

function parsePublished(value: FormDataEntryValue | null): boolean {
  if (value === null) return false
  const truthy = ['true', 'on', '1', 'yes']
  return truthy.includes(String(value).toLowerCase())
}

function parseString(value: FormDataEntryValue | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function createAdminPostAction(formData: FormData) {
  const payload: CreatePostDto = {
    title: String(formData.get('title') ?? ''),
    content: String(formData.get('content') ?? ''),
    excerpt: parseString(formData.get('excerpt')),
    coverImage: parseString(formData.get('coverImage')),
    published: parsePublished(formData.get('published')),
    categoryId: String(formData.get('categoryId') ?? ''),
    tagIds: formData.getAll('tagIds').map((value) => String(value)).filter(Boolean),
  }

  await createAdminPost(payload)
}

export async function updateAdminPostAction(formData: FormData) {
  const slug = parseString(formData.get('slug'))
  if (!slug) {
    throw new Error('수정할 포스트의 slug가 필요합니다.')
  }

  const payload: UpdatePostDto = {
    title: parseString(formData.get('title')),
    content: parseString(formData.get('content')),
    excerpt: parseString(formData.get('excerpt')),
    coverImage: parseString(formData.get('coverImage')),
    published: parsePublished(formData.get('published')),
    categoryId: parseString(formData.get('categoryId')),
    tagIds: formData
      .getAll('tagIds')
      .map((value) => String(value))
      .filter(Boolean),
  }

  await updateAdminPost(slug, payload)

  redirect('/admin/posts?status=updated')
}

export async function deleteAdminPostAction(formData: FormData) {
  const slug = parseString(formData.get('slug'))
  if (!slug) {
    throw new Error('삭제할 포스트의 slug가 필요합니다.')
  }

  await deleteAdminPost(slug)
}
