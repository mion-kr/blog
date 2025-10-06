'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

import type {
  CreatePostDto,
  PostResponseDto,
  UpdatePostDto,
} from '@repo/shared';

import { apiClient } from '@/lib/api-client';
import { handleServerAuthError } from '@/lib/auth';
import { ApiError, ReauthenticationRequiredError } from '@/lib/api-errors';

import { requireTokenOrRedirect } from './auth';
import {
  parseCreatePostForm,
  parseDeletePostForm,
  parseUpdatePostForm,
} from './form-parser';

export async function createAdminPost(payload: CreatePostDto): Promise<void> {
  const token = await requireTokenOrRedirect('/admin/posts/new');

  try {
    const response = await apiClient.posts.createPost(payload, { token });

    revalidatePath('/admin/posts');
    if (response?.success && response.data) {
      redirect('/admin/posts?status=created');
    }

    const failureMessage = response?.message ?? '포스트 생성에 실패했어요.';
    redirect(
      `/admin/posts/new?status=error&message=${encodeURIComponent(failureMessage)}`,
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/posts/new' });
    }

    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했어요.';

    redirect(`/admin/posts/new?status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function updateAdminPost(
  slug: string,
  payload: UpdatePostDto,
): Promise<PostResponseDto> {
  const token = await requireTokenOrRedirect(`/admin/posts/${slug}/edit`);

  try {
    const response = await apiClient.posts.updatePost(slug, payload, { token });

    revalidatePath('/admin/posts');
    revalidatePath(`/admin/posts/${slug}`);
    if (response?.success && response.data) {
      return response.data;
    }
  } catch (error) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: `/admin/posts/${slug}/edit` });
    }

    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했어요.';

    redirect(
      `/admin/posts/${slug}/edit?status=error&message=${encodeURIComponent(message)}`,
    );
  }

  throw new Error('포스트 수정 결과를 가져오지 못했습니다.');
}

export async function deleteAdminPost(slug: string): Promise<void> {
  const token = await requireTokenOrRedirect('/admin/posts');

  try {
    await apiClient.posts.deletePost(slug, { token });
    revalidatePath('/admin/posts');
    redirect('/admin/posts?status=deleted');
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: '/admin/posts' });
    }

    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : '삭제 중 오류가 발생했어요.';

    redirect(`/admin/posts?status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function createAdminPostAction(formData: FormData) {
  const payload = parseCreatePostForm(formData);
  await createAdminPost(payload);
}

export async function updateAdminPostAction(formData: FormData) {
  const { slug, payload } = parseUpdatePostForm(formData);
  await updateAdminPost(slug, payload);
  redirect('/admin/posts?status=updated');
}

export async function deleteAdminPostAction(formData: FormData) {
  const slug = parseDeletePostForm(formData);
  await deleteAdminPost(slug);
}
