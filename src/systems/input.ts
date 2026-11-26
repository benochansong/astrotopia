import type { InputFrame } from "../core/types";
export class Input {
  held = new Set<string>();
  pressed = new Set<string>();
  onMenu: (key: string) => void = () => {};
  private controller = new AbortController();
  constructor() {
    window.addEventListener(
      "keydown",
      (e) => {
        if (
          (e.target as HTMLElement)?.matches("input,select,textarea") &&
          e.code !== "Escape"
        )
          return;
        if (
          (e.target as HTMLElement)?.matches("button") &&
          ["Space", "Enter"].includes(e.code)
        )
          return;
        if (
          ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
            e.code,
          )
        )
          e.preventDefault();
        if (!e.repeat) {
          this.pressed.add(e.code);
          if (["Escape", "KeyI", "KeyM"].includes(e.code)) this.onMenu(e.code);
        }
        this.held.add(e.code);
      },
      { signal: this.controller.signal },
    );
    window.addEventListener("keyup", (e) => this.held.delete(e.code), {
      signal: this.controller.signal,
    });
    window.addEventListener("blur", () => this.clear(), {
      signal: this.controller.signal,
    });
  }
  frame(): InputFrame {
    return {
      left: this.held.has("KeyA") || this.held.has("ArrowLeft"),
      right: this.held.has("KeyD") || this.held.has("ArrowRight"),
      jump: this.pressed.has("Space"),
      jumpHeld: this.held.has("Space"),
      dash: this.pressed.has("ShiftLeft") || this.pressed.has("ShiftRight"),
      down: this.held.has("KeyS") || this.held.has("ArrowDown"),
      attack: this.held.has("KeyJ"),
      interact: this.pressed.has("KeyF"),
      heal: this.pressed.has("KeyH"),
    };
  }
  flush() {
    this.pressed.clear();
  }
  clear() {
    this.held.clear();
    this.pressed.clear();
  }
  destroy() {
    this.controller.abort();
  }
}
