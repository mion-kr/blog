import { asc, desc } from '@repo/database';

type SortDirection = 'asc' | 'desc';

type CountRow = { count: number | string | null };

type CountQuery<TCondition> = Promise<CountRow[]> & {
  where: (condition: TCondition) => Promise<CountRow[]>;
};

/**
 * 정렬 방향 문자열을 Drizzle 정렬 함수로 변환합니다.
 */
export function resolveOrderDirection(order: SortDirection) {
  // `asc`/`desc` 문자열을 그대로 Drizzle 함수에 매핑합니다.
  return order === 'asc' ? asc : desc;
}

/**
 * 정렬 필드에 해당하는 orderBy 표현식을 반환합니다.
 */
export function resolveOrderBy<TSort extends string, TExpression>(
  sort: TSort,
  sortMap: Record<TSort, TExpression>,
  fallbackSortKey: TSort,
): TExpression {
  // 미지정/예외 케이스에서도 기본 정렬 키를 일관되게 사용합니다.
  return sortMap[sort] ?? sortMap[fallbackSortKey];
}

/**
 * 검색어를 trim 처리해 비어 있으면 `undefined`를 반환합니다.
 */
export function normalizeSearch(search?: string): string | undefined {
  // 공백만 입력된 검색어를 필터 미적용 상태로 정규화합니다.
  const trimmed = search?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * 페이지/리밋 기반 offset 값을 계산합니다.
 */
export function resolveOffset(page: number, limit: number): number {
  // 페이징 쿼리에서 공통으로 사용하는 offset 계산입니다.
  return (page - 1) * limit;
}

/**
 * 카운트 쿼리를 실행해 숫자 total 값을 반환합니다.
 */
export async function resolveTotal<TCondition>(
  baseQuery: CountQuery<TCondition>,
  whereCondition?: TCondition,
): Promise<number> {
  // where 조건 유무에 따라 동일한 카운트 파싱 경로를 사용합니다.
  const rows = whereCondition
    ? await baseQuery.where(whereCondition)
    : await baseQuery;
  const [{ count } = { count: 0 }] = rows;

  return Number(count ?? 0);
}
