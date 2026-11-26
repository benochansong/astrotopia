import type { Settings } from "../core/types";
// All audio is synthesized locally; no samples or external licensing dependencies.
export class AudioSystem {
  private currentRegion = "";
  private context: AudioContext | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private voices: OscillatorNode[] = [];
  private ambience: OscillatorNode | null = null;
  constructor(private settings: Settings) {}
  start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.music = this.context.createGain();
      this.sfx = this.context.createGain();
      this.music.connect(this.context.destination);
      this.sfx.connect(this.context.destination);
      [65.406, 98, 130.813, 164.814, 196].forEach((f, i) => {
        const o = this.context!.createOscillator(),
          g = this.context!.createGain();
        o.type = "sine";
        o.frequency.value = f;
        o.detune.value = i % 2 ? 3 : -3;
        g.gain.value = 0.018;
        o.connect(g);
        g.connect(this.music!);
        o.start();
        this.voices.push(o);
      });
      this.ambience = this.context.createOscillator();
      this.ambience.type = "sine";
      this.ambience.frequency.value = 392;
      const gain = this.context.createGain();
      gain.gain.value = 0.007;
      this.ambience.connect(gain);
      gain.connect(this.music);
      this.ambience.start();
      this.set(this.settings);
    }
    void this.context.resume().catch(() => {});
  }
  set(settings: Settings) {
    this.settings = settings;
    if (this.music) this.music.gain.value = settings.music;
    if (this.sfx) this.sfx.gain.value = settings.sfx;
  }
  region(id: string) {
    if (id === this.currentRegion || !this.ambience || !this.context) return;
    this.currentRegion = id;
    this.ambience.frequency.setTargetAtTime(
      id === "forest" ? 440 : id === "valley" ? 523.25 : 392,
      this.context.currentTime,
      2,
    );
    const root = id.startsWith("boss")
      ? 41.2 + Number(id.slice(4)) * 3
      : id === "valley"
        ? 73.416
        : id === "forest"
          ? 58.27
          : 65.406;
    this.voices.forEach((voice, i) =>
      voice.frequency.setTargetAtTime(
        root * [1, 1.5, 2, 2.52, 3][i],
        this.context!.currentTime,
        3,
      ),
    );
  }
  suspend() {
    void this.context?.suspend();
  }
  play(name: string) {
    if (!this.context || !this.sfx || this.settings.sfx === 0) return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain();
    o.connect(g);
    g.connect(this.sfx);
    const t = c.currentTime;
    const sounds: Record<string, [number, number, number, OscillatorType]> = {
      pulse: [700, 140, 0.12, "triangle"],
      rifle: [180, 60, 0.065, "square"],
      blade: [1700, 90, 0.22, "sawtooth"],
      cannon: [85, 28, 0.65, "sawtooth"],
      cryo: [2300, 1100, 0.24, "sine"],
      hammer: [110, 22, 0.45, "triangle"],
      charge: [130, 450, 0.6, "sine"],
      explosion: [60, 20, 0.5, "sawtooth"],
      critical: [900, 1900, 0.18, "triangle"],
      shield: [240, 580, 0.6, "sine"],
      burst: [440, 80, 0.4, "sawtooth"],
      wave: [350, 1200, 0.35, "triangle"],
      orbital: [1400, 30, 0.8, "sawtooth"],
      aerial: [120, 900, 0.3, "sine"],
      bossIntro: [55, 110, 1.8, "sawtooth"],
      bossPhase: [90, 270, 1.2, "square"],
      bossWindup: [150, 440, 0.6, "triangle"],
      bossOverload: [110, 25, 0.7, "sawtooth"],
      bossVictory: [260, 1040, 1.5, "sine"],
      rareLoot: [660, 1760, 0.6, "triangle"],
      shoot: [700, 140, 0.12, "triangle"],
      impact: [150, 60, 0.1, "square"],
      hit: [120, 45, 0.22, "sawtooth"],
      mine: [900, 400, 0.1, "triangle"],
      pickup: [650, 1100, 0.17, "sine"],
      level: [440, 1320, 0.7, "sine"],
      quest: [523, 1046, 0.5, "sine"],
      land: [90, 40, 0.09, "triangle"],
      dash: [230, 850, 0.14, "triangle"],
      heal: [330, 660, 0.5, "sine"],
      death: [140, 35, 0.8, "sine"],
      ui: [460, 620, 0.07, "sine"],
      step: [70, 50, 0.035, "triangle"],
    };
    const [from, to, duration, type] =
      sounds[name] ??
      (name.startsWith("impact_")
        ? sounds.impact
        : name.startsWith("enemy_")
          ? sounds.hit
          : sounds.ui);
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(
      name === "shoot" ? 0.045 : 0.065,
      t + 0.008,
    );
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.start(t);
    o.stop(t + duration + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
}
