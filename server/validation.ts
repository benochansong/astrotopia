import { emptyInput, type InputFrame } from "../src/core/types";
export function requireThat(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function record(v: unknown): Record<string, unknown> {
  requireThat(
    v && typeof v === "object" && !Array.isArray(v),
    "객체 형식이 필요합니다.",
  );
  return v as Record<string, unknown>;
}
export function text(v: unknown, max = 80, min = 1): string {
  requireThat(
    typeof v === "string" &&
      v.length >= min &&
      v.length <= max &&
      !/[\u0000-\u001f\u007f]/.test(v),
    "문자열 범위를 확인하세요.",
  );
  const trimmed = v.trim();
  requireThat(trimmed.length >= min, "빈 문자열은 사용할 수 없습니다.");
  return trimmed;
}
export function integer(v: unknown, min: number, max: number): number {
  requireThat(
    Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max,
    "정수 범위를 확인하세요.",
  );
  return Number(v);
}
export function keys(v: Record<string, unknown>, allowed: string[]) {
  requireThat(
    Object.keys(v).every((k) => allowed.includes(k)),
    "허용하지 않는 필드입니다.",
  );
}
export function input(v: unknown): InputFrame {
  const source = record(v),
    result = emptyInput();
  const names = [
    "left",
    "right",
    "jump",
    "jumpHeld",
    "dash",
    "down",
    "attack",
    "interact",
    "heal",
    "special",
    "up",
    "ultimate",
    "anchor",
    "vehicle",
    "scan",
  ];
  keys(source, [...names, "skillSlot", "weaponSlot", "quick"]);
  for (const k of names)
    if (k in source) {
      requireThat(typeof source[k] === "boolean", "입력 형식 오류");
      (result as unknown as Record<string, unknown>)[k] = source[k];
    }
  if ("skillSlot" in source) result.skillSlot = integer(source.skillSlot, 0, 3);
  return result;
}
