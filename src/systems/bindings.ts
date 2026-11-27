export const defaultBindings: Record<string, string> = {
  KeyA: "KeyA",
  KeyD: "KeyD",
  KeyW: "KeyW",
  KeyS: "KeyS",
  Space: "Space",
  ShiftLeft: "ShiftLeft",
  KeyJ: "KeyJ",
  KeyK: "KeyK",
  KeyF: "KeyF",
  KeyX: "KeyX",
  KeyZ: "KeyZ",
  KeyH: "KeyH",
};
export const bindingNames: Record<string, string> = {
  KeyA: "왼쪽",
  KeyD: "오른쪽",
  KeyW: "수영 상승·상향 조준",
  KeyS: "하강·하향 조준",
  Space: "점프·제트팩",
  ShiftLeft: "대시",
  KeyJ: "공격",
  KeyK: "특수 공격",
  KeyF: "상호작용",
  KeyX: "자세 제동",
  KeyZ: "차량 승하차",
  KeyH: "회복",
};
export const bindingCodes = [
  ...Object.keys(defaultBindings),
  "ControlLeft",
  "KeyP",
  "KeyY",
];
