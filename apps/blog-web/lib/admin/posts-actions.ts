'use server'

import { revalidatePath } from 'next/cache'

import type {
  ApiResponse,
  CreatePostDto,
  PostResponseDto,
  UpdatePostDto,
} from '@repo/shared'

import { apiClient } from '../api-client'
import { getAuthorizationToken, handleServerAuthError } from '../auth'
import { ReauthenticationRequiredError } from '../api-errors'

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
): Promise<ApiResponse<PostResponseDto>> {
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
    return response
  } catch (error) {
    // 인증 오류면 재로그인으로 리다이렉트, 아니면 상위에서 처리
    handleServerAuthError(error, { returnTo: '/admin/posts/new' })
  }
}

export async function updateAdminPost(
  slug: string,
  payload: UpdatePostDto
): Promise<ApiResponse<PostResponseDto>> {
  const token = await requireTokenOrRedirect(`/admin/posts/${slug}/edit`)

  try {
    const response = await apiClient.put<PostResponseDto>(
      `/api/posts/${slug}`,
      payload,
      { token }
    )

    revalidatePath('/admin/posts')
    revalidatePath(`/admin/posts/${slug}`)
    return response
  } catch (error) {
    handleServerAuthError(error, { returnTo: `/admin/posts/${slug}/edit` })
  }
}

export async function deleteAdminPost(
  slug: string
): Promise<ApiResponse<null>> {
  const token = await requireTokenOrRedirect('/admin/posts')

  try {
    const response = await apiClient.delete<null>(`/api/posts/${slug}`, { token })
    revalidatePath('/admin/posts')
    return response
  } catch (error) {
    handleServerAuthError(error, { returnTo: '/admin/posts' })
  }
}
