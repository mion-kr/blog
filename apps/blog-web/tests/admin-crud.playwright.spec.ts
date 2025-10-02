import { expect, test } from '@playwright/test'

import { createAdminSessionToken } from './test-helpers'

function uniqueSuffix() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function uniqueId(prefix: string) {
  return `${prefix} ${uniqueSuffix()}`
}

test.describe.serial('[E2E] 관리자 콘텐츠 CRUD', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL이 설정되어 있어야 합니다.')
    }

    const sessionToken = await createAdminSessionToken()

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: sessionToken,
        domain: new URL(baseURL).hostname,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 60 * 60,
      },
    ])
  })

  test('[E2E] 포스트 CRUD 플로우를 검증한다', async ({ page }) => {
    const postTitle = uniqueId('Playwright E2E 포스트')
    const updatedPostTitle = `${postTitle} (수정)`
    const postExcerpt = 'Playwright E2E로 생성한 테스트 포스트입니다.'
    const updatedExcerpt = 'Playwright E2E로 수정된 테스트 포스트입니다.'
    const postContent = '# Playwright E2E 테스트\n\n이 글은 자동화 검증용입니다.'
    const updatedContent = '# Playwright E2E 테스트 (수정)\n\n업데이트된 검증 시나리오입니다.'

    await page.goto('/admin/posts')
    await expect(page.getByRole('heading', { name: '포스트 관리' })).toBeVisible()

    await page.getByRole('link', { name: '새 포스트 작성' }).click()
    await expect(page.getByRole('heading', { name: '새 포스트 작성' })).toBeVisible()

    await page.getByLabel('제목').fill(postTitle)
    await page.getByLabel('대표 이미지 URL').fill('https://example.com/playwright-post.png')
    await page.getByLabel('요약 (선택)').fill(postExcerpt)
    await page.getByLabel('본문 (MDX)').fill(postContent)
    await page.getByLabel('카테고리').selectOption('category-dev')

    const tagInput = page.getByPlaceholder('태그 이름 또는 슬러그 입력').first()
    await tagInput.click()
    await tagInput.fill('Next')
    await page.getByRole('button', { name: 'Next.js /nextjs' }).click()

    await page.getByRole('button', { name: '포스트 저장' }).click()

    await expect(page).toHaveURL(/\/admin\/posts(\?|$)/)
    await expect(page.getByText('새 포스트가 저장되었어요!')).toBeVisible({ timeout: 5000 })

    const postRow = page.getByRole('row', { name: new RegExp(postTitle) })
    await expect(postRow).toBeVisible({ timeout: 5000 })

    await postRow.getByRole('link', { name: '편집' }).click()
    await expect(page.getByRole('heading', { name: '포스트 수정' })).toBeVisible()

    await page.getByLabel('제목').fill(updatedPostTitle)
    await page.getByLabel('요약 (선택)').fill(updatedExcerpt)
    await page.getByLabel('본문 (MDX)').fill(updatedContent)

    const editTagInput = page.getByPlaceholder('태그 이름 또는 슬러그 입력')
    await editTagInput.fill('Type')
    await page.getByRole('button', { name: 'TypeScript /typescript' }).click()

    await page.getByLabel('발행 상태로 저장하기').check()
    await page.getByRole('button', { name: '변경 사항 저장' }).click()

    await expect(page).toHaveURL(/\/admin\/posts(\?|$)/)
    await expect(page.getByText('변경 사항이 저장되었어요!')).toBeVisible({ timeout: 5000 })
    const updatedPostRow = page.getByRole('row', { name: new RegExp(updatedPostTitle) })
    await expect(updatedPostRow).toBeVisible()
    await expect(updatedPostRow.getByText('발행됨')).toBeVisible()
    await expect(updatedPostRow.getByText('TypeScript')).toBeVisible()

    await updatedPostRow.getByRole('link', { name: '편집' }).click()
    await expect(page.getByRole('heading', { name: '포스트 수정' })).toBeVisible()

    await page.getByRole('button', { name: '포스트 삭제' }).click()

    await expect(page).toHaveURL(/status=deleted/)
    await expect(page.getByText('포스트가 삭제되었어요.')).toBeVisible({ timeout: 5000 })
    await expect(updatedPostRow).toHaveCount(0)
  })

  test('[E2E] 카테고리 CRUD 플로우를 검증한다', async ({ page }) => {
    const categoryName = uniqueId('플레이테스트 카테고리')
    const updatedCategoryName = `${categoryName} (수정)`
    const categorySlug = `playwright-category-${uniqueSuffix()}`
    const updatedDescription = 'Playwright E2E로 수정된 카테고리입니다.'

    await page.goto('/admin/categories')
    await expect(page.getByRole('heading', { name: '카테고리 관리' })).toBeVisible()

    await page.getByRole('link', { name: '새 카테고리' }).click()
    const createModal = page.getByRole('dialog')
    await expect(createModal.getByRole('heading', { name: '새 카테고리 추가' })).toBeVisible()

    await createModal.getByLabel('카테고리 이름').fill(categoryName)
    await createModal.getByLabel('슬러그').fill(categorySlug)
    await createModal.getByLabel('설명 (선택)').fill('Playwright E2E로 생성한 카테고리입니다.')
    await createModal.getByRole('button', { name: '카테고리 저장' }).click()

    await expect(page).toHaveURL(/status=created/)
    await expect(page.getByText('카테고리가 생성되었어요.')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('row', { name: new RegExp(categoryName) })).toBeVisible()

    await page.getByRole('row', { name: new RegExp(categoryName) }).getByRole('link', { name: '수정' }).click()
    const editModal = page.getByRole('dialog')
    await expect(editModal.getByRole('heading', { name: '카테고리 수정' })).toBeVisible()

    await editModal.getByLabel('카테고리 이름').fill(updatedCategoryName)
    await editModal.getByLabel('설명 (선택)').fill(updatedDescription)
    await editModal.getByRole('button', { name: '변경 사항 저장' }).click()

    await expect(page).toHaveURL(/status=updated/)
    await expect(page.getByText('카테고리가 수정되었어요.')).toBeVisible({ timeout: 5000 })
    const updatedCategoryRow = page.getByRole('row', { name: new RegExp(updatedCategoryName) })
    await expect(updatedCategoryRow).toBeVisible()

    await updatedCategoryRow.getByRole('link', { name: '수정' }).click()
    const deleteModal = page.getByRole('dialog')
    await expect(deleteModal.getByRole('heading', { name: '카테고리 수정' })).toBeVisible()
    await deleteModal.getByRole('button', { name: '카테고리 삭제' }).click()
    await page.getByRole('button', { name: '삭제하기' }).click()

    await expect(page).toHaveURL(/status=deleted/)
    await expect(page.getByText('카테고리가 삭제되었어요.')).toBeVisible({ timeout: 5000 })
    await expect(updatedCategoryRow).toHaveCount(0)
  })

  test('[E2E] 태그 CRUD 플로우를 검증한다', async ({ page }) => {
    const tagName = uniqueId('플레이테스트 태그')
    const updatedTagName = `${tagName} (수정)`
    const tagSlug = `playwright-tag-${uniqueSuffix()}`
    const updatedTagSlug = `${tagSlug}-updated`

    await page.goto('/admin/tags')
    await expect(page.getByRole('heading', { name: '태그 관리' })).toBeVisible()

    await page.getByRole('link', { name: '새 태그' }).click()
    const createModal = page.getByRole('dialog')
    await expect(createModal.getByRole('heading', { name: '새 태그 추가' })).toBeVisible()

    await createModal.getByLabel('태그 이름').fill(tagName)
    await createModal.getByLabel('슬러그').fill(tagSlug)
    await createModal.getByRole('button', { name: '태그 저장' }).click()

    await expect(page).toHaveURL(/status=created/)
    await expect(page.getByText('태그가 생성되었어요.')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('row', { name: new RegExp(tagName) })).toBeVisible()

    await page.getByRole('row', { name: new RegExp(tagName) }).getByRole('link', { name: '수정' }).click()
    const editModal = page.getByRole('dialog')
    await expect(editModal.getByRole('heading', { name: '태그 수정' })).toBeVisible()

    await editModal.getByLabel('태그 이름').fill(updatedTagName)
    await editModal.getByLabel('슬러그').fill(updatedTagSlug)
    await editModal.getByRole('button', { name: '변경 사항 저장' }).click()

    await expect(page).toHaveURL(/status=updated/)
    await expect(page.getByText('태그가 수정되었어요.')).toBeVisible({ timeout: 5000 })
    const updatedTagRow = page.getByRole('row', { name: new RegExp(updatedTagName) })
    await expect(updatedTagRow).toBeVisible()

    await updatedTagRow.getByRole('link', { name: '수정' }).click()
    const deleteModal = page.getByRole('dialog')
    await expect(deleteModal.getByRole('heading', { name: '태그 수정' })).toBeVisible()
    await deleteModal.getByRole('button', { name: '태그 삭제' }).click()
    await page.getByRole('button', { name: '삭제하기' }).click()

    await expect(page).toHaveURL(/status=deleted/)
    await expect(page.getByText('태그가 삭제되었어요.')).toBeVisible({ timeout: 5000 })
    await expect(updatedTagRow).toHaveCount(0)
  })
})
