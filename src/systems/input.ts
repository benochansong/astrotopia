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
          if (["Escape", "KeyI", "KeyM", "KeyC", "KeyV"].includes(e.code))
            this.onMenu(e.code);
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
      special: this.pressed.has("KeyK"),
      weaponSlot: this.pressed.has("Digit1")
        ? 0
        : this.pressed.has("Digit2")
          ? 1
          : undefined,
      skillSlot: this.pressed.has("KeyQ")
        ? 0
        : this.pressed.has("KeyE")
          ? 1
          : this.pressed.has("KeyR")
            ? 2
            : this.pressed.has("KeyT")
              ? 3
              : undefined,
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
