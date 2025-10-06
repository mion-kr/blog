'use server'

import {
  createAdminPost as baseCreateAdminPost,
  updateAdminPost as baseUpdateAdminPost,
  deleteAdminPost as baseDeleteAdminPost,
  createAdminPostAction as baseCreateAdminPostAction,
  updateAdminPostAction as baseUpdateAdminPostAction,
  deleteAdminPostAction as baseDeleteAdminPostAction,
} from '@/features/posts/server/actions';

export const createAdminPost = baseCreateAdminPost;
export const updateAdminPost = baseUpdateAdminPost;
export const deleteAdminPost = baseDeleteAdminPost;
export const createAdminPostAction = baseCreateAdminPostAction;
export const updateAdminPostAction = baseUpdateAdminPostAction;
export const deleteAdminPostAction = baseDeleteAdminPostAction;
