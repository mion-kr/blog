/**
 * JSON-LD를 HTML script 요소에 안전하게 삽입할 수 있도록 직렬화합니다.
 */
export function serializeJsonLd(value: object): string {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new TypeError("JSON-LD value must be serializable.");
  }

  return serialized.replace(/</g, "\\u003c");
}
