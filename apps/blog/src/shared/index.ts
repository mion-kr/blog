// packages/shared를 앱 안으로 옮긴 것(design.md D3). 타입과 slug만 쓴다.
export * from './types/index';
export { generateSlug, generateEnglishSlug, createUniqueSlug } from '../lib/slug';
