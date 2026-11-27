import { ColonyRoom } from "./colony-room";
import { Store, opaque } from "./database";
import type { Character, Mob, View, Bag } from "../shared/online";
import {
  campaign,
  dungeonDefinitions,
  type ExpeditionState,
  type ExpeditionView,
  type Mission,
  type Instance,
} from "../shared/expedition-online";
import {
  planetForRegion,
  baseForPlanet,
  planetIds,
  type PlanetId,
} from "../src/space/catalog";
import {
  regions,
  enemyData,
  type RegionId,
  type ItemId,
} from "../src/data/content";
import { maxHp, xpRequired } from "../src/physics/movement";
import { recipes, technologies } from "../src/survival/catalog";
import { marketPrices } from "../src/civilization/catalog";
import type { Endpoint } from "../src/civilization/types";
import { requireThat as need, text, integer, keys } from "./validation";
export const gravity: Record<PlanetId, number> = {
  eden: 0.9,
  ares: 0.65,
  frostia: 1.2,
  inferno: 1.5,
  aquaria: 1,
  lunaris: 0.2,
  omega: 1,
};
export class ExpeditionRoom extends ColonyRoom {
  declare state: ExpeditionState;
  private second = 0;
  constructor(s: ExpeditionState, store: Store) {
    super(s, store);
    s.exploration ??= {
      campaign: [],
      voyages: [],
      missions: [],
      instances: [],
      gear: {},
      corps: {
        name: s.name + " 탐사단",
        banner: "#92d8c2",
        reputation: 0,
        bosses: 0,
        goal: "일곱 세계의 기록",
      },
      ending: "",
      vote: null,
    };
    this.sync();
  }
  static override create(
    store: Store,
    account: { id: string; name: string },
    name: string,
    limit: number,
  ) {
    const base = ColonyRoom.create(store, account, name, limit);
    return new ExpeditionRoom(base.state, store);
  }
  get exploration() {
    return this.state.exploration!;
  }
  planet(c: Character): PlanetId {
    return c.region === "ship"
      ? (this.exploration.voyages.find(
          (v) => v.boarded.includes(c.id) && v.arrive,
        )?.from ?? "eden")
      : c.region === "station"
        ? "eden"
        : planetForRegion(c.region);
  }
  available() {
    return planetIds.filter(
      (_, i) =>
        i === 0 || this.exploration.campaign.includes(campaign[i - 1].kind),
    );
  }
  override base(c: Character) {
    need(
      c.region === baseForPlanet(this.planet(c)) && !c.instance && !c.downUntil,
      "현재 행성의 착륙 기지에서 이용하세요.",
    );
  }
  override terrain(c: Character) {
    return c.region === baseForPlanet(this.planet(c)) &&
      this.engine.space.state.planets[this.planet(c)]
      ? this.planet(c) === this.engine.space.state.location
        ? this.engine.map
        : this.engine.space.withPlanet(this.planet(c), () => this.engine.map)
      : regions[c.region];
  }
  override movementGravity(c: Character) {
    return c.region === "ship" || c.region === "station"
      ? 0.9
      : gravity[this.planet(c)];
  }
  override action(
    c: Character,
    action: string,
    a: Record<string, unknown>,
  ): unknown {
    const p = this.planet(c);
    let result: unknown;
    if (
      this.engine.space.state.planets[p] &&
      p !== this.engine.space.state.location
    )
      result = this.engine.space.withPlanet(p, () =>
        this.expeditionAction(c, action, a),
      );
    else result = this.expeditionAction(c, action, a);
    this.sync();
    return result;
  }
  private roster(c: Character) {
    const party = c.party ? this.state.parties[c.party] : null;
    need(party && party.leader === c.id, "파티 대장만 시작할 수 있습니다.");
    const members = party.members.map((id) => this.state.characters[id]);
    need(
      members.length >= 2 &&
        members.every((p) => p.connected && !p.downUntil && this.same(c, p)),
      "같은 지역의 접속 중인 파티원 2명 이상이 필요합니다.",
    );
    return { party, members };
  }
  private pay(cost: Bag) {
    need(
      this.engine.survival.storage.spend(cost),
      "공동 창고의 자원이 부족합니다.",
    );
  }
  private expeditionAction(
    c: Character,
    action: string,
    a: Record<string, unknown>,
  ): unknown {
    const w = this.engine,
      e = this.exploration;
    switch (action) {
      case "region": {
        if (["crash", "forest", "valley"].includes(String(a.region)))
          return super.action(c, action, a);
        keys(a, ["region"]);
        const target = text(a.region) as RegionId;
        need(
          Object.hasOwn(regions, target) &&
            planetForRegion(target) === this.planet(c) &&
            !["station", "ship"].includes(target) &&
            !c.instance &&
            !c.downUntil,
          "이 지역으로 이동할 수 없습니다.",
        );
        need(
          Math.abs(c.body.x - regions[c.region].spawn) < 180 ||
            c.body.x > regions[c.region].width - 200,
          "지역 출입구에서 이동하세요.",
        );
        this.changeRegion(c, target);
        return;
      }
      case "boss": {
        keys(a, []);
        const boss = campaign.find((b) => b.region === c.region);
        need(
          boss && !c.instance && !c.downUntil && c.body.level >= boss.level,
          "현재 지역의 보스 호출 조건과 레벨을 확인하세요.",
        );
        need(
          !this.state.mobs.some(
            (m) => m.boss && m.region === c.region && !m.instance && m.hp > 0,
          ),
          "이미 보스가 출현했습니다.",
        );
        const m = this.spawn(
          boss.kind,
          c.region,
          Math.min(regions[c.region].width - 350, c.body.x + 550),
          780,
          "",
          true,
        );
        m.maxHp = m.hp = Math.max(600, enemyData[boss.kind].hp);
        return;
      }
      case "gear": {
        keys(a, ["kind"]);
        this.base(c);
        need(a.kind === "weapon" || a.kind === "suit", "장비 종류 오류");
        const g = (e.gear[c.id] ??= { weapon: 0, suit: 0 });
        const tier = g[a.kind];
        need(tier < 7, "최대 업그레이드입니다.");
        need(e.campaign.length >= tier, "선행 행성 조사 기록이 필요합니다.");
        this.take(c.inventory, "iron", 5 * (tier + 1));
        this.take(c.inventory, "crystal", 3 * (tier + 1));
        need(c.credits >= 30 * (tier + 1), "개인 크레딧 부족");
        c.credits -= 30 * (tier + 1);
        g[a.kind]++;
        this.audit(c, `${a.kind} 장비 ${tier + 1}단계 제작`);
        return;
      }
      case "scienceResearch": {
        keys(a, ["technology"]);
        this.access(c, "research");
        this.base(c);
        const id = text(a.technology);
        need(Object.hasOwn(technologies, id), "기술 오류");
        need(
          w.survival.research.start(id),
          w.survival.production.reason(id, "research") ||
            "연구를 시작할 수 없습니다.",
        );
        this.audit(c, `${technologies[id].name} 세계 연구`);
        return;
      }
      case "craftShared": {
        keys(a, ["recipe", "count"]);
        this.access(c, "configure");
        this.base(c);
        const id = text(a.recipe);
        need(
          Object.hasOwn(recipes, id) && recipes[id].result.kind === "item",
          "공동 창고에는 자원 레시피만 생산합니다.",
        );
        const count = integer(a.count, 1, 10);
        w.player.level = c.body.level;
        need(
          w.survival.production.enqueue(id, "craft", count),
          w.survival.production.reason(id, "craft", count) || "제작 불가",
        );
        return;
      }
      case "collectJob": {
        keys(a, ["job"]);
        this.access(c, "configure");
        this.base(c);
        need(
          w.survival.production.claim(integer(a.job, 1, 1e9)),
          "아직 작업이 완료되지 않았거나 창고가 가득 찼습니다.",
        );
        for (const [id, n] of Object.entries(w.inventory)) {
          if (!n) continue;
          const wh = w.survival.state.warehouse as Bag;
          this.bag(wh, id, n, w.colony.capacity);
          delete w.inventory[id as ItemId];
        }
        return;
      }
      case "shipPropose": {
        keys(a, ["planet"]);
        this.access(c, "ship");
        this.base(c);
        const { party } = this.roster(c),
          to = text(a.planet) as PlanetId;
        need(
          this.available().includes(to) && to !== this.planet(c),
          "항해 목적지가 해금되지 않았습니다.",
        );
        need(
          !e.voyages.some((v) => v.party === party.id),
          "이미 항해 계획이 있습니다.",
        );
        e.voyages.push({
          id: opaque(),
          party: party.id,
          from: this.planet(c),
          to,
          boarded: [],
          ready: [],
          arrive: 0,
          cost: 2 + planetIds.indexOf(to) * 2,
          fuelItem:
            regions[baseForPlanet(this.planet(c))].resources.find((n) =>
              /crystal/i.test(n.item),
            )?.item ??
            regions[baseForPlanet(this.planet(c))].resources[0]?.item ??
            "crystal",
        });
        return;
      }
      case "shipBoard":
      case "shipReady":
      case "shipLeave": {
        keys(a, ["voyage"]);
        const v = e.voyages.find((v) => v.id === text(a.voyage));
        need(
          v && c.party === v.party && !v.arrive,
          "항해 계획에 참여할 수 없습니다.",
        );
        this.base(c);
        need(this.planet(c) === v.from, "출발 행성에 있어야 합니다.");
        if (action === "shipBoard" && !v.boarded.includes(c.id))
          v.boarded.push(c.id);
        if (action === "shipReady") {
          need(v.boarded.includes(c.id), "먼저 탑승하세요.");
          if (!v.ready.includes(c.id)) v.ready.push(c.id);
        }
        if (action === "shipLeave") {
          v.boarded = v.boarded.filter((id) => id !== c.id);
          v.ready = v.ready.filter((id) => id !== c.id);
        }
        return;
      }
      case "shipDepart": {
        keys(a, ["voyage"]);
        this.access(c, "ship");
        const { party } = this.roster(c),
          v = e.voyages.find((v) => v.id === text(a.voyage));
        need(
          v && v.party === party.id && !v.arrive && v.boarded.length >= 2,
          "항해 계획을 확인하세요.",
        );
        need(
          v.boarded.every(
            (id) =>
              v.ready.includes(id) &&
              this.state.characters[id].connected &&
              this.state.characters[id].party === party.id &&
              this.same(c, this.state.characters[id]),
          ),
          "모든 탑승자가 준비해야 합니다.",
        );
        this.pay({ [v.fuelItem ?? "crystal"]: v.cost });
        v.arrive = this.state.clock + 12;
        for (const id of v.boarded)
          this.changeRegion(this.state.characters[id], "ship", "ship:" + v.id);
        this.audit(
          c,
          `${v.to.toUpperCase()} 출발 · ${v.fuelItem ?? "crystal"} ${v.cost} 소비`,
        );
        return;
      }
      case "shipCancel":
        keys(a, ["voyage"]);
        need(
          e.voyages.some(
            (v) =>
              v.id === a.voyage &&
              !v.arrive &&
              this.state.parties[v.party]?.leader === c.id,
          ),
          "취소 권한 또는 항해 상태를 확인하세요.",
        );
        e.voyages = e.voyages.filter((v) => v.id !== a.voyage);
        return;
      case "mission": {
        keys(a, ["kind"]);
        const { party, members } = this.roster(c);
        const kind = text(a.kind) as Mission["kind"];
        need(
          ["resources", "science", "rescue", "industry", "ruins"].includes(
            kind,
          ),
          "임무 종류 오류",
        );
        need(
          !e.missions.some((m) => m.party === party.id && !m.done),
          "진행 중인 임무를 먼저 완료하세요.",
        );
        e.missions.push({
          id: opaque(),
          party: party.id,
          kind,
          region: c.region,
          progress: 0,
          goal:
            kind === "resources"
              ? 10
              : kind === "science" || kind === "industry"
                ? 3
                : 1,
          contributors: [],
          scanned: [],
          baseline: w.colony.state.buildings.reduce(
            (n, b) => n + b.produced,
            0,
          ),
          done: false,
        });
        e.missions = e.missions.slice(-50);
        this.state.parties[party.id].mission = kind;
        for (const p of members) p.ready = false;
        return;
      }
      case "missionInteract": {
        keys(a, []);
        const m = e.missions.find((m) => m.party === c.party && !m.done);
        need(
          m && c.region === m.region && !c.downUntil,
          "임무 지역에서 활동하세요.",
        );
        if (m.kind === "resources") {
          const item = regions[c.region].resources[0]?.item ?? "iron";
          this.take(c.inventory, item, 2);
          this.bag(w.survival.state.warehouse as Bag, item, 2);
          m.progress += 2;
        } else if (m.kind === "science") {
          const mob = this.state.mobs.find(
            (v) =>
              v.hp > 0 &&
              this.same(c, v) &&
              Math.abs(v.x - c.body.x) < 300 &&
              !m.scanned.includes(v.id),
          );
          need(mob, "300px 내 아직 분석하지 않은 생명체가 필요합니다.");
          m.scanned.push(mob.id);
          m.progress++;
        } else if (m.kind === "rescue") {
          need(
            Math.abs(c.body.x - 1500) < 100,
            "구조 신호 X=1500 부근에서 생존자를 찾으세요.",
          );
          this.take(c.inventory, "medkit", 1);
          m.progress = 1;
        } else if (m.kind === "industry") {
          this.base(c);
          m.progress =
            w.colony.state.buildings.reduce((n, b) => n + b.produced, 0) -
            m.baseline;
          need(
            m.progress >= m.goal,
            "임무 시작 후 자동 생산품 3개를 완료하세요.",
          );
        } else throw new Error("협동 보스 처치 또는 던전 완료로 진행합니다.");
        if (!m.contributors.includes(c.id)) m.contributors.push(c.id);
        this.completeMission(m);
        return;
      }
      case "dungeon": {
        keys(a, ["dungeon"]);
        const id = text(a.dungeon) as keyof typeof dungeonDefinitions;
        need(Object.hasOwn(dungeonDefinitions, id), "던전 오류");
        const d = dungeonDefinitions[id],
          { party, members } = this.roster(c);
        this.base(c);
        need(
          this.planet(c) === d.planet &&
            members.every((p) => p.ready && p.body.level >= d.level),
          "해당 행성 기지에서 요구 레벨과 모든 파티원의 준비를 확인하세요.",
        );
        need(
          !e.instances.some(
            (i) => i.party === party.id && !i.cleared && !i.abandoned,
          ),
          "진행 중인 던전이 있습니다.",
        );
        const instance: Instance = {
          id: opaque(),
          party: party.id,
          kind: id,
          region: d.region,
          roster: members.map((p) => p.id),
          cleared: false,
          devices: {},
          exposedUntil: 0,
        };
        e.instances.push(instance);
        for (const p of members) {
          this.changeRegion(p, d.region, instance.id);
          p.ready = false;
          p.revives = 0;
        }
        // One isolated copy of the existing map; ordinary enemies plus an encounter boss.
        const boss = this.spawn(
          d.boss,
          d.region,
          Math.min(regions[d.region].width - 400, 2400),
          780,
          instance.id,
          true,
        );
        boss.maxHp = boss.hp = id === "crystal" ? 800 : enemyData[d.boss].hp;
        return;
      }
      case "instanceLeave": {
        keys(a, []);
        need(
          c.instance && !c.instance.startsWith("ship:"),
          "인스턴스가 아닙니다.",
        );
        const p = this.planet(c);
        this.changeRegion(c, baseForPlanet(p));
        return;
      }
      case "raid": {
        keys(a, []);
        this.base(c);
        const { party, members } = this.roster(c);
        need(
          e.ending && members.every((p) => p.ready && p.body.level >= 90),
          "엔딩 이후 레벨 90 이상, 전원 준비가 필요합니다.",
        );
        need(
          !e.instances.some(
            (i) => i.party === party.id && !i.cleared && !i.abandoned,
          ),
          "진행 중인 원정이 있습니다.",
        );
        const instance: Instance = {
          id: opaque(),
          party: party.id,
          kind: "raid",
          region: "station",
          roster: members.map((p) => p.id),
          cleared: false,
          devices: {},
          exposedUntil: 0,
        };
        e.instances.push(instance);
        for (const p of members) {
          this.changeRegion(p, "station", instance.id);
          p.ready = false;
          p.revives = 0;
        }
        const boss = this.spawn(
          "genesisZero",
          "station",
          2500,
          780,
          instance.id,
          true,
        );
        boss.maxHp = boss.hp = 18000;
        return;
      }
      case "raidDevice": {
        keys(a, ["device"]);
        const instance = e.instances.find(
          (i) => i.id === c.instance && i.kind === "raid" && !i.cleared,
        );
        need(instance && !c.downUntil, "활성 레이드가 아닙니다.");
        const count = instance.roster.length === 4 ? 4 : 2,
          index = integer(a.device, 0, count - 1);
        need(
          Math.abs(
            c.body.x - (count === 4 ? 1800 + index * 400 : 2100 + index * 800),
          ) < 120,
          "장치 반경 120px에서 작동하세요.",
        );
        instance.devices[`${index}:${c.id}`] = this.state.clock + 5;
        c.supportUntil = this.state.clock + 10;
        const active = Object.keys(instance.devices).filter(
          (key) =>
            instance.devices[key] > this.state.clock &&
            this.state.characters[key.split(":")[1]]?.connected,
        );
        if (
          new Set(active.map((k) => k.split(":")[0])).size >= count &&
          new Set(active.map((k) => k.split(":")[1])).size >= count
        ) {
          instance.exposedUntil = this.state.clock + 10;
          instance.devices = {};
        }
        return;
      }
      case "corps": {
        keys(a, ["name", "banner", "goal"]);
        this.access(c, "settings");
        e.corps.name = text(a.name, 30);
        e.corps.goal = text(a.goal, 80);
        const banner = text(a.banner, 7);
        need(/^#[0-9a-f]{6}$/i.test(banner), "색상 오류");
        e.corps.banner = banner;
        if (e.corps.reputation >= 100) this.quest(c, 100);
        return;
      }
      case "endingStart": {
        keys(a, []);
        need(
          c.id === this.state.owner &&
            !e.ending &&
            !e.vote &&
            e.campaign.includes("genesisZero"),
          "월드 소유자만 GENESIS 이후 시작할 수 있습니다.",
        );
        const eligible = Object.values(this.state.characters)
          .filter(
            (p) =>
              p.connected && p.uniqueRewards?.includes("campaign:genesisZero"),
          )
          .map((p) => p.id);
        need(
          eligible.includes(c.id),
          "소유자가 GENESIS 조사에 참여해야 합니다.",
        );
        e.vote = {
          eligible,
          ballots: {},
          until: this.state.clock + 60,
          result: "",
        };
        this.audit(
          c,
          "엔딩 투표 시작: 참가자 과반수, 동률/미달은 재투표, 소유자 최종 확인",
        );
        return;
      }
      case "endingVote": {
        keys(a, ["ending"]);
        const vote = e.vote,
          ending = text(a.ending);
        need(
          vote &&
            vote.eligible.includes(c.id) &&
            this.state.clock < vote.until &&
            ["freedom", "harmony", "rebirth"].includes(ending),
          "투표 조건을 확인하세요.",
        );
        vote.ballots[c.id] = ending;
        return;
      }
      case "endingConfirm": {
        keys(a, []);
        const v = e.vote;
        need(
          c.id === this.state.owner && v && v.result && !e.ending,
          "집계 결과와 소유자 권한을 확인하세요.",
        );
        e.ending = v.result as typeof e.ending;
        w.omega.state.ending = e.ending || null;
        w.omega.state.kills.genesisZero = 1;
        e.vote = null;
        this.audit(c, `영구 엔딩 확정: ${e.ending}`);
        return;
      }
      case "market": {
        keys(a, ["item", "count", "side"]);
        this.access(c, "trade");
        this.access(c, "withdraw");
        const item = text(a.item) as ItemId;
        need(
          Object.hasOwn(marketPrices, item) &&
            (a.side === "buy" || a.side === "sell"),
          "시장 품목 오류",
        );
        need(
          w.civilization.trade(
            this.planet(c),
            item,
            integer(a.count, 1, 1000),
            a.side,
          ),
          "시장 재고·공동 자금·물류 연구를 확인하세요.",
        );
        this.audit(c, `공동 시장 ${a.side}: ${item} × ${a.count}`);
        return;
      }
      case "freighter":
        keys(a, ["tier"]);
        this.access(c, "configure");
        need(
          w.civilization.buildShip(
            integer(a.tier, 1, 2) as 1 | 2,
            this.planet(c),
          ),
          "물류 연구·가동 우주항·자원을 확인하세요.",
        );
        return;
      case "route": {
        keys(a, ["ship", "to", "item", "amount", "target"]);
        this.access(c, "configure");
        const to = text(a.to) as Endpoint,
          item = text(a.item) as ItemId;
        need(
          w.civilization.createRoute(integer(a.ship, 1, 1e9), {
            name: "공동 보급",
            from: this.planet(c),
            to,
            item,
            amount: integer(a.amount, 1, 9900),
            target: integer(a.target, 1, 99999),
            minimum: 10,
            interval: 10,
            priority: 2,
            repeat: true,
          }),
          "항로·우주항·화물선 조건을 확인하세요.",
        );
        return;
      }
      case "routeToggle":
        keys(a, ["route"]);
        this.access(c, "configure");
        need(w.civilization.toggleRoute(integer(a.route, 1, 1e9)), "항로 없음");
        return;
      case "shipService":
      case "shipRecall":
        keys(a, ["ship"]);
        this.access(c, "configure");
        need(
          w.civilization[action === "shipService" ? "service" : "recall"](
            integer(a.ship, 1, 1e9),
          ),
          "화물선 상태를 확인하세요.",
        );
        return;
      case "stationBuild":
        keys(a, []);
        this.access(c, "build");
        need(
          w.civilization.buildStation(),
          "엔딩·궤도 연구·다행성 산업·단계 자재를 확인하세요.",
        );
        return;
      case "stationVisit":
        keys(a, []);
        this.base(c);
        need(
          w.civilization.state.station.stage > 0,
          "정거장을 먼저 건설하세요.",
        );
        this.changeRegion(c, "station");
        w.civilization.state.station.visited = true;
        return;
      case "stationLeave":
        keys(a, []);
        need(c.region === "station" && !c.instance, "정거장에 있지 않습니다.");
        this.changeRegion(c, c.checkpoint.region);
        return;
      case "stationTransfer": {
        keys(a, ["item", "count", "deposit"]);
        need(
          c.region === "station" &&
            !c.instance &&
            w.civilization.state.station.stage > 0,
          "정거장 내부에서 이용하세요.",
        );
        need(typeof a.deposit === "boolean", "방향 오류");
        this.access(c, a.deposit ? "deposit" : "withdraw");
        const item = text(a.item),
          count = integer(a.count, 1, 9999),
          wh = w.civilization.state.station.warehouse as Bag;
        this.take(a.deposit ? c.inventory : wh, item, count);
        this.bag(
          a.deposit ? wh : c.inventory,
          item,
          count,
          a.deposit ? 300 * w.civilization.state.station.stage : 200,
        );
        this.audit(c, `정거장 ${a.deposit ? "납품" : "회수"} ${item} ${count}`);
        return;
      }
      case "odyssey":
        keys(a, []);
        this.access(c, "ship");
        need(
          w.civilization.buildOdyssey(),
          "정거장 단계·HORIZON·정거장 자재를 확인하세요.",
        );
        return;
      case "restorePlanet":
        keys(a, []);
        this.access(c, "research");
        need(
          w.civilization.restore(this.planet(c)),
          "엔딩·복원 연구·가동 중인 연구 센터와 자재를 확인하세요.",
        );
        return;
      default:
        return super.action(c, action, a);
    }
  }
  private completeMission(m: Mission) {
    if (m.progress < m.goal || m.done) return;
    m.done = true;
    for (const id of m.contributors) {
      const c = this.state.characters[id];
      if (!c.connected || c.party !== m.party) continue;
      this.credit(c, 50);
      c.body.xp += 150;
      this.quest(c, 97);
      this.audit(c, `협동 ${m.kind} 임무 완료`);
    }
    this.exploration.corps.reputation += 10;
    this.dirty = true;
  }
  override enemy(m: Mob, players: Character[], dt: number) {
    const instance = this.exploration.instances.find(
      (i) => i.id === m.instance && i.kind === "raid",
    );
    if (!instance || !m.boss || m.hp <= 0) {
      super.enemy(m, players, dt);
      return;
    }
    const eligible = players.filter((c) => !c.downUntil && this.same(c, m));
    if (!eligible.length) {
      m.target = "";
      m.telegraph = 0;
      m.hp = m.maxHp;
      m.contributors = {};
      return;
    }
    const now = this.state.clock;
    m.phase = Math.min(4, 1 + Math.floor(4 * (1 - m.hp / m.maxHp)));
    if (m.telegraph) {
      if (now < m.telegraph) return;
      for (const c of eligible) {
        const hit =
          m.pattern === "overload"
            ? (m.attackTargets ?? []).some((x) => Math.abs(c.body.x - x) < 110)
            : m.pattern === "shock"
              ? c.body.grounded && Math.abs(c.body.x - m.attackX) < 520
              : m.pattern === "gravity"
                ? Math.abs(c.body.x - m.attackX) < 180
                : Math.abs(c.body.x - m.attackX) < 320 &&
                  Math.abs(c.body.y + 64 - m.y) < 110;
        if (hit && c.body.invulnerable <= 0) {
          c.body.hp = Math.max(
            0,
            c.body.hp -
              (m.phase === 4 ? 100 : 70) * (c.shieldUntil > now ? 0.5 : 1),
          );
          c.body.invulnerable = 0.6;
          if (!c.body.hp) {
            c.downUntil = now + 25;
            this.inputs.delete(c.id);
          }
          if (c.shieldUntil > now && c.shieldFrom) {
            const source = this.state.characters[c.shieldFrom];
            if (source?.connected) {
              source.supportUntil = now + 10;
              this.quest(source, 94);
            }
          }
        }
      }
      m.telegraph = 0;
      m.nextAttack = now + (m.phase === 4 ? 1.2 : 2.5);
      m.cycles = (m.cycles ?? 0) + 1;
      if (
        m.phase <= 2 &&
        m.cycles % 3 === 0 &&
        this.state.mobs.filter(
          (x) => x.instance === m.instance && !x.boss && x.hp > 0,
        ).length < 4
      ) {
        const drone = this.spawn(
          "quantumDrone",
          "station",
          m.x + (m.cycles % 2 ? 240 : -240),
          710,
          m.instance,
        );
        drone.maxHp = drone.hp = 1200;
        drone.scale = 1;
      }
      this.dirty = true;
      return;
    }
    if (m.phase === 3)
      for (const c of eligible)
        c.body.x +=
          Math.sign(m.x - c.body.x) *
          Math.min(40, Math.abs(m.x - c.body.x)) *
          dt;
    if (now >= m.nextAttack) {
      const target = eligible
        .slice()
        .sort((a, b) => Math.abs(a.body.x - m.x) - Math.abs(b.body.x - m.x))[0];
      m.target = target.id;
      m.attackX = target.body.x;
      m.attackTargets = eligible.map((c) => c.body.x);
      m.pattern =
        m.phase === 1
          ? "laser"
          : m.phase === 2
            ? "shock"
            : m.phase === 3
              ? "gravity"
              : "overload";
      m.telegraph = now + (m.phase === 4 ? 1.1 : 1.6);
    }
  }
  override hit(c: Character, m: Mob, damage: number) {
    const alive = m.hp > 0,
      instance = this.exploration.instances.find((i) => i.id === m.instance);
    if (instance?.kind === "raid")
      damage *= instance.exposedUntil > this.state.clock ? 1.6 : 0.35;
    super.hit(
      c,
      m,
      damage * (1 + (this.exploration.gear[c.id]?.weapon ?? 0) * 0.2),
    );
    if (alive && m.hp === 0 && m.boss) {
      this.exploration.corps.bosses++;
      this.exploration.corps.reputation += 20;
      if (!m.instance && !this.exploration.campaign.includes(m.kind)) {
        this.exploration.campaign.push(m.kind);
        if (m.kind === "titan") {
          this.engine.battle.bossKills++;
          this.engine.colony.state.coreAnalyzed = true;
          this.engine.progress.counters.ancientAnalysis = 1;
          this.engine.survival.state.sentinelBlueprint = true;
        }
        if (m.kind === "nexusGuardian")
          this.engine.extreme.state.horizon = true;
        if (m.kind === "genesisZero")
          this.engine.omega.state.kills.genesisZero = 1;
      }
      const participants = Object.values(this.state.characters).filter(
        (p) =>
          p.connected &&
          this.same(p, m) &&
          p.rewards.includes(`${m.id}:${m.encounter}`),
      );
      for (const p of participants) {
        if (
          !m.instance &&
          !(p.uniqueRewards ??= []).includes("campaign:" + m.kind)
        )
          p.uniqueRewards.push("campaign:" + m.kind);
        p.body.xp += 500 + campaign.findIndex((b) => b.kind === m.kind) * 500;
      }
      if (instance) {
        instance.cleared = true;
        for (const p of participants) {
          this.quest(p, instance.kind === "raid" ? 99 : 98);
          const first = `first:${instance.kind}`;
          if (!(p.uniqueRewards ??= []).includes(first)) {
            p.uniqueRewards.push(first);
            this.credit(p, 250);
            this.loot(p, "crystal", 10);
          }
          this.audit(
            p,
            `${instance.kind === "raid" ? "STELLAR COLOSSUS" : "협동 던전"} 완료`,
          );
        }
      }
      for (const mission of this.exploration.missions)
        if (
          !mission.done &&
          mission.kind === "ruins" &&
          mission.party === c.party
        ) {
          mission.progress = 1;
          mission.contributors = participants.map((p) => p.id);
          this.completeMission(mission);
        }
      this.sync();
    }
  }
  override tick(dt: number) {
    if (!Object.values(this.state.characters).some((c) => c.connected)) return;
    const e = this.exploration;
    for (const v of [...e.voyages])
      if (v.arrive && this.state.clock >= v.arrive) {
        if (!this.engine.space.state.planets[v.to]) {
          const old = this.engine.space.state.location;
          this.engine.space.switchPlanet(v.to);
          this.engine.space.switchPlanet(old);
        }
        for (const id of v.boarded) {
          const c = this.state.characters[id];
          this.changeRegion(c, baseForPlanet(v.to));
          this.engine.space.state.launched = true;
          if (v.to === "omega") this.engine.omega.state.visited = true;
          this.quest(c, 97);
        }
        e.voyages = e.voyages.filter((x) => x.id !== v.id);
        this.sync();
        this.dirty = true;
      }
    for (const instance of e.instances)
      if (
        !instance.cleared &&
        !instance.abandoned &&
        instance.roster.every(
          (id) => this.state.characters[id].instance !== instance.id,
        )
      )
        instance.abandoned = true;
    if (e.instances.length > 40) {
      const drop = e.instances
        .filter((i) => i.cleared || i.abandoned)
        .slice(0, e.instances.length - 40)
        .map((i) => i.id);
      e.instances = e.instances.filter((i) => !drop.includes(i.id));
      this.state.mobs = this.state.mobs.filter(
        (m) => !drop.includes(m.instance),
      );
    }
    const vote = e.vote;
    if (vote && !vote.result && this.state.clock >= vote.until) {
      const counts = ["freedom", "harmony", "rebirth"]
        .map((id) => ({
          id,
          n: Object.values(vote.ballots).filter((v) => v === id).length,
        }))
        .sort((a, b) => b.n - a.n);
      if (counts[0].n > vote.eligible.length / 2) vote.result = counts[0].id;
      else e.vote = null;
      this.dirty = true;
    }
    this.second += dt;
    if (this.second >= 1) {
      this.second = 0;
      for (const c of Object.values(this.state.characters))
        if (c.connected && !c.downUntil) {
          while (c.body.level < 100 && c.body.xp >= xpRequired(c.body.level)) {
            c.body.xp -= xpRequired(c.body.level);
            c.body.level++;
          }
          const p = this.planet(c),
            hazard = planetIds.indexOf(p),
            suit = e.gear[c.id]?.suit ?? 0;
          if (
            hazard > 0 &&
            c.region !== baseForPlanet(p) &&
            !["ship", "station"].includes(c.region) &&
            suit < hazard
          ) {
            c.body.hp = Math.max(0, c.body.hp - (hazard - suit) * 2);
            if (!c.body.hp) c.downUntil = this.state.clock + 25;
          }
          const raid = e.instances.find(
            (i) => i.id === c.instance && i.kind === "raid" && !i.cleared,
          );
          if (raid) {
            const boss = this.state.mobs.find(
              (m) => m.instance === raid.id && m.boss,
            );
            if (boss && boss.phase >= 3)
              c.body.energy = Math.min(100, c.body.energy + 8);
          }
        }
    }
    super.tick(dt);
  }
  override view(id: string): View {
    const c = this.state.characters[id],
      planet = this.planet(c),
      v =
        this.engine.space.state.planets[planet] &&
        planet !== this.engine.space.state.location
          ? this.engine.space.withPlanet(planet, () => super.view(id))
          : super.view(id);
    const exploration = structuredClone(this.exploration);
    exploration.gear = { [id]: exploration.gear[id] ?? { weapon: 0, suit: 0 } };
    exploration.instances = exploration.instances.filter(
      (i) => i.party === c.party,
    );
    exploration.missions = exploration.missions.filter(
      (m) => m.party === c.party,
    );
    exploration.voyages = exploration.voyages.filter(
      (v) => v.party === c.party,
    );
    v.extension = {
      ...v.extension,
      exploration,
      available: this.available(),
      planet,
      gravity: this.movementGravity(c),
      jobs:
        planet === this.engine.space.state.location
          ? this.engine.survival.state.jobs
          : (this.engine.space.state.planets[planet]?.local.jobs ?? []),
      civilization: this.engine.civilization.state,
    } as unknown as Record<string, unknown>;
    return v;
  }
}
