import type { Cost, Recipe, Technology } from "../survival/catalog";
import type { ItemId } from "../data/content";
export type ExtremePlanet = "frostia" | "inferno" | "aquaria" | "lunaris";
export type ExtremeRegion =
  `${ExtremePlanet}${"Landing" | "Wilds" | "Depths" | "Ruins"}`;
export const extremeIds: ExtremePlanet[] = [
  "frostia",
  "inferno",
  "aquaria",
  "lunaris",
];
export const extremePlanets = {
  frostia: {
    available: true,
    name: "FROSTIA",
    gravity: 1.2,
    level: 45,
    color: "#a8dfe8",
    sky: ["#102135", "#387087", "#accfd2"],
    names: [
      "빙하 착륙지",
      "고요한 빙하",
      "서리 수정 동굴",
      "잃어버린 연구 기지",
    ],
    en: [
      "FROZEN LANDING SITE",
      "SILENT GLACIER",
      "FROST CRYSTAL CAVERN",
      "LOST RESEARCH STATION",
    ],
    weather: "눈보라",
    tech: "cryoEngineering",
    gear: "thermalSuit",
    boss: "leviathan",
    archive: "고대 연구 기록",
    fuel: 25,
  },
  inferno: {
    available: true,
    name: "INFERNO",
    gravity: 1.5,
    level: 60,
    color: "#ed9c6b",
    sky: ["#230f2a", "#662e34", "#f18c51"],
    names: ["흑요석 착륙지", "용암의 강", "화산 심층부", "헬리오스 발전 유적"],
    en: [
      "OBSIDIAN LANDING",
      "MAGMA RIVER",
      "VOLCANIC DEPTHS",
      "HELIOS REACTOR",
    ],
    weather: "화산재 폭풍",
    tech: "thermalEngineering",
    gear: "thermalShield",
    boss: "helios",
    archive: "고대 발전 기록",
    fuel: 30,
  },
  aquaria: {
    available: true,
    name: "AQUARIA",
    gravity: 1,
    level: 75,
    color: "#89d9d6",
    sky: ["#082b48", "#17657e", "#7ad6c7"],
    names: ["산호 착륙섬", "발광 산호초", "심해 해구", "수몰된 아틀란티스"],
    en: [
      "CORAL LANDING ISLAND",
      "LUMINOUS REEF",
      "ABYSSAL TRENCH",
      "SUNKEN ATLANTIS",
    ],
    weather: "심해 난류",
    tech: "oceanEngineering",
    gear: "aquaSuit",
    boss: "emperor",
    archive: "생명 적응 기록",
    fuel: 35,
  },
  lunaris: {
    available: true,
    name: "LUNARIS",
    gravity: 0.2,
    level: 90,
    color: "#c9b6e3",
    sky: ["#040814", "#1e2041", "#625d7a"],
    names: ["고요한 분화구", "부유 능선", "별빛 관측소", "무중력 연결 지대"],
    en: ["SILENT CRATER", "FLOATING RIDGE", "STAR OBSERVATORY", "ZERO-G NEXUS"],
    weather: "태양 입자 폭풍",
    tech: "zeroGEngineering",
    gear: "vacuumSuit",
    boss: "archon",
    archive: "고대 항법 기록",
    fuel: 40,
  },
} as const;
export const extremeRows = {
  luminousCoral: ["발광 산호", "#8be6be"],
  deepCrystal: ["심해 수정", "#71cbd5"],
  pressureOre: ["고압 광석", "#749db2"],
  seaTitanium: ["해양 티타늄", "#a4c6cf"],
  alienPearl: ["외계 진주", "#dccbea"],
  aquaFiber: ["아쿠아 섬유", "#8cdbc9"],
  deepEnzyme: ["심해 효소", "#8dbcb4"],
  pressureCrystal: ["압력 결정", "#69aec1"],
  marineAlloy: ["고대 해양 합금", "#b9ccca"],
  seaCore: ["해양 에너지 코어", "#80ded1"],
  pressureAlloy: ["고압 합금", "#96bfc6"],
  hydroModule: ["수중 추진 모듈", "#8fdad4"],
  bioPolymer: ["생체 고분자", "#8ac7bd"],
  marineCell: ["해양 에너지 셀", "#78dfdf"],
  pressureUnit: ["압력 제어 장치", "#b5d3d9"],
  lifeEfficiency: ["산소 재순환 부품", "#c0d5b8"],
  abyssalCore: ["ABYSSAL EMPEROR CORE", "#85d7eb"],
  zeroGBlueprint: ["무중력 탐험 설계도", "#b3b4df"],
  moonCrystal: ["월면 수정", "#d2c6ed"],
  cosmicMetal: ["우주 금속", "#b3aacd"],
  helium: ["헬륨 결정", "#c9d7dd"],
  gravityCrystal: ["중력 결정", "#bc8fe9"],
  meteorAlloy: ["운석 합금", "#a8a0b2"],
  denseCosmicOre: ["고밀도 우주 광석", "#8f85b2"],
  quantumCircuit: ["양자 회로", "#dec5f6"],
  gravityPart: ["중력 제어 부품", "#b9a9e4"],
  navCrystal: ["항법 수정", "#c1d8f0"],
  voidCore: ["공허 에너지 코어", "#b69bd8"],
  lightAlloy: ["경량 합금", "#c3bdcf"],
  quantumCell: ["양자 에너지 셀", "#b9c3f0"],
  gravityCircuit: ["중력 회로", "#c2a5ed"],
  advancedDrive: ["고급 추진 장치", "#d2bdf3"],
  longNav: ["장거리 항법 모듈", "#adcadc"],
  spaceShield: ["우주 차폐 소재", "#c0afd5"],
  voidArchonCore: ["VOID ARCHON CORE", "#d6b3f2"],
  omegaCoordinates: ["OMEGA 항법 좌표", "#f4d8a1"],
  obsidian: ["흑요석 광물", "#615967"],
  iridium: ["이리듐 광석", "#b8a7c3"],
  tungsten: ["텅스텐 광석", "#c3b6b4"],
  geothermalCrystal: ["지열 결정", "#efb171"],
  magmaCore: ["마그마 코어", "#f19b69"],
  denseThermal: ["고밀도 열 결정", "#ea9a62"],
  ceramicOre: ["내열 세라믹 광물", "#d6bbaa"],
  volcanicTissue: ["화산 생체 조직", "#e0a299"],
  reactorCircuit: ["고대 발전 회로", "#dfb5aa"],
  heliosAlloy: ["헬리오스 합금", "#d7b191"],
  ultraAlloy: ["초내열 합금", "#e5c4a5"],
  densePlate: ["고밀도 금속판", "#bac2cd"],
  thermalMaterial: ["고온 차폐 소재", "#d9b297"],
  plasmaCell: ["플라즈마 에너지 셀", "#ebaad0"],
  geothermalModule: ["지열 발전 모듈", "#d5bba5"],
  exoParts: ["외골격 부품", "#cfbdba"],
  engineParts: ["고출력 엔진 부품", "#e6c7ad"],
  heliosCore: ["HELIOS CORE", "#f4ae78"],
  deepData: ["심해 탐험 데이터", "#addad9"],
  glacierCrystal: ["빙하 결정", "#9bd9ee"],
  cryoOre: ["극저온 광석", "#abc9dd"],
  blueCrystal: ["청색 에너지 결정", "#88bce8"],
  coolantCore: ["냉각 코어", "#8ad2d7"],
  pureMetal: ["고순도 금속", "#cbdee1"],
  iceTissue: ["얼음 생체 조직", "#91d3c7"],
  ancientResearch: ["고대 연구 데이터", "#aad6e3"],
  superconductor: ["초전도 소재", "#a0c5f2"],
  cryoAlloy: ["극저온 합금", "#a9c3dd"],
  coolingCell: ["고효율 냉각 셀", "#b3e6dd"],
  superCircuit: ["초전도 회로", "#c8bdee"],
  lifeParts: ["강화 생명 유지 부품", "#b2cece"],
  advancedBattery: ["고급 에너지 저장 장치", "#aadada"],
  glacialCore: ["GLACIAL LEVIATHAN 코어", "#9dd2ff"],
  infernoNav: ["INFERNO 항법 데이터", "#e3c5a4"],
} as const;
export type ExtremeItem = keyof typeof extremeRows;
export const extremeItems = Object.fromEntries(
  Object.entries(extremeRows).map(([id, [name, color]]) => [
    id,
    {
      name,
      color,
      icon: "◇",
      type: id.includes("Core") || id.includes("Nav") ? "연구 데이터" : "소재",
      description: "극한 행성 탐험·장비 제작·산업 연구에 사용합니다.",
    },
  ]),
) as Record<
  ExtremeItem,
  {
    name: string;
    color: string;
    icon: string;
    type: string;
    description: string;
  }
>;
const gear = (
  name: string,
  slot: string,
  cold = 0,
  heat = 0,
  pressure = 0,
  oxygen = 0,
  efficiency = 0,
) => ({
  name,
  slot,
  cold,
  heat,
  pressure,
  oxygen,
  efficiency,
  toxic: 0,
  radiation: 0,
  unstable: 0,
  defense: 8,
});
export const extremeGear = {
  jetpack1: gear("JETPACK MK-I", "light"),
  jetpack3: gear("JETPACK MK-III", "light"),
  zeroGPack: gear("ZERO-G MANEUVER PACK", "light"),
  aquaSuit: gear("수중 탐험복", "suit", 0, 0, 400),
  hydroPropulsor: gear("수중 추진기", "core"),
  deepPressureSuit: gear("심해 내압복", "suit", 0, 0, 1600),
  sonar: gear("수중 소나", "mask", 0, 0, 100),
  rebreather: gear("산소 재순환기", "oxygen", 0, 0, 0, 300, 0.7),
  abyssLight: gear("심해 조명", "light"),
  vacuumSuit: { ...gear("진공 탐험복", "suit", 70), radiation: 65 },
  radShield: { ...gear("방사선 차폐 장치", "stabilizer", 15), radiation: 25 },
  magneticBoots: gear("자력 부츠", "boots", 5),
  zeroGStabilizer: gear("무중력 자세 제어기", "core", 5),
  advancedJetCore: gear("JETPACK MK-II · 고급 추진 코어", "light"),
  cosmicShield: { ...gear("우주 보호 헬멧", "mask", 5), radiation: 15 },
  universalSuit1: {
    ...gear("범용 탐험복 Mk I", "suit", 40, 40, 600),
    toxic: 35,
    radiation: 40,
  },
  universalSuit2: {
    ...gear("범용 탐험복 Mk II", "suit", 55, 55, 1000),
    toxic: 50,
    radiation: 55,
  },
  universalSuit3: {
    ...gear("범용 탐험복 Mk III", "suit", 65, 65, 1300),
    toxic: 60,
    radiation: 65,
  },
  thermalShield: { ...gear("고열 차폐복", "suit", 0, 70), toxic: 20 },
  cryoCooling: gear("극한 냉각 코어", "stabilizer", 0, 25),
  exoskeleton: gear("중력 강화 외골격", "core", 0, 5),
  magmaBoots: gear("마그마 보호 부츠", "boots", 0, 5),
  ashFilter: { ...gear("화산재 필터", "mask"), toxic: 55 },
  thermalSuit: gear("극저온 탐험복", "suit", 65),
  heatingCore: gear("발열 코어", "stabilizer", 25),
  iceBoots: gear("빙판 대응 부츠", "boots", 5),
  sealedHelmet: gear("밀폐형 헬멧", "mask", 5, 0, 0, 20),
  lifeSupport2: gear("고급 생명 유지 모듈", "oxygen", 0, 0, 0, 200, 0.5),
};
export const extremeTech: Technology[] = [
  {
    id: "oceanEngineering",
    name: "해양 탐험 공학",
    requires: ["geothermalEngineering"],
    cost: { deepData: 1, ultraAlloy: 2 },
    description: "수중 탐험복·추진기 및 AQUARIA 항해",
    branch: "극한 환경",
    points: 6,
    seconds: 18,
  },
  {
    id: "pressureEngineering",
    name: "심해 압력 공학",
    requires: ["oceanEngineering"],
    cost: { pressureOre: 3, deepCrystal: 2 },
    description: "내압복·해양 산업 및 산소 재순환",
    branch: "극한 환경",
    points: 6,
    seconds: 18,
  },
  {
    id: "zeroGEngineering",
    name: "무중력 탐험 공학",
    requires: ["pressureEngineering"],
    cost: { zeroGBlueprint: 1, pressureAlloy: 2 },
    description: "진공 탐험복·제트팩 및 LUNARIS 항해",
    branch: "극한 환경",
    points: 6,
    seconds: 18,
  },
  {
    id: "quantumEngineering",
    name: "양자 항법 공학",
    requires: ["zeroGEngineering"],
    cost: { quantumCircuit: 2, gravityCrystal: 2 },
    description: "양자 산업·장거리 항법·우주 차폐",
    branch: "극한 환경",
    points: 6,
    seconds: 18,
  },
  {
    id: "universalEngineering",
    name: "통합 환경 공학",
    requires: ["quantumEngineering", "superconductivity"],
    cost: { longNav: 1, lifeEfficiency: 2 },
    description: "범용 탐험복 Mk I–III",
    branch: "극한 환경",
    points: 6,
    seconds: 18,
  },
  {
    id: "thermalEngineering",
    name: "극한 온도 공학",
    branch: "극한 환경",
    requires: ["superconductivity"],
    cost: { ancientResearch: 2, coolingCell: 2 },
    points: 5,
    seconds: 15,
    description: "내열 차폐복·냉각 코어·강화 외골격·HORIZON 업그레이드",
  },
  {
    id: "geothermalEngineering",
    name: "고급 지열 공학",
    branch: "극한 환경",
    requires: ["thermalEngineering"],
    cost: { geothermalCrystal: 2, reactorCircuit: 1 },
    points: 5,
    seconds: 15,
    description: "지열 발전 및 초내열 산업 소재",
  },
  {
    id: "cryoEngineering",
    name: "극저온 탐험 공학",
    branch: "극한 환경",
    requires: ["pathfinder"],
    cost: { data: 3, heatAlloy: 2 },
    points: 4,
    seconds: 12,
    description: "FROSTIA 탐험복·발열 코어·빙판 부츠 제작 및 항해",
  },
  {
    id: "superconductivity",
    name: "초전도 소재 공학",
    branch: "극한 환경",
    requires: ["cryoEngineering"],
    cost: { cryoOre: 2, ancientResearch: 1 },
    points: 4,
    seconds: 12,
    description: "냉각 셀·초전도 회로·고급 배터리 제작",
  },
];
export function installExtremeRecipes(recipes: Record<string, Recipe>) {
  const put = (
    id: string,
    name: string,
    cost: Cost,
    result: Recipe["result"],
    tech = "cryoEngineering",
    facility: Recipe["facility"] = "equipment",
  ) =>
    (recipes[id] = {
      id,
      name,
      cost,
      result,
      tech,
      facility,
      seconds: 8,
      level: 1,
      description: "극한 탐험 장비 및 행성 고유 소재",
    });
  const costs: Record<keyof typeof extremeGear, Cost> = {
    jetpack1: { engineParts: 1, advancedBattery: 1 },
    jetpack3: { advancedDrive: 2, quantumCell: 2 },
    zeroGPack: { gravityCircuit: 3, quantumCell: 3, spaceShield: 2 },
    aquaSuit: { ultraAlloy: 3, polymer: 3, coolingCell: 2 },
    hydroPropulsor: { engineParts: 2, advancedBattery: 1 },
    deepPressureSuit: { pressureAlloy: 4, bioPolymer: 2 },
    sonar: { superCircuit: 2, ultraAlloy: 1 },
    rebreather: { lifeEfficiency: 2, bioPolymer: 2 },
    abyssLight: { deepCrystal: 2, advancedBattery: 1 },
    vacuumSuit: { pressureAlloy: 3, marineAlloy: 2, lifeParts: 2 },
    radShield: { ultraAlloy: 2, alienPearl: 2 },
    magneticBoots: { marineAlloy: 2, superCircuit: 1 },
    zeroGStabilizer: { pressureUnit: 2, superCircuit: 2 },
    advancedJetCore: { hydroModule: 2, engineParts: 2 },
    cosmicShield: { pressureAlloy: 2, polymer: 2 },
    universalSuit1: { spaceShield: 2, thermalMaterial: 2, bioPolymer: 2 },
    universalSuit2: { spaceShield: 3, pressureUnit: 2, superCircuit: 2 },
    universalSuit3: { spaceShield: 4, gravityCircuit: 2, lifeEfficiency: 3 },
    thermalShield: { heatAlloy: 3, coolingCell: 2, polymer: 2 },
    cryoCooling: { coolingCell: 2, cobaltAlloy: 2 },
    exoskeleton: { cryoAlloy: 2, cobaltAlloy: 2, superCircuit: 1 },
    magmaBoots: { heatAlloy: 2, wovenFiber: 2 },
    ashFilter: { polymer: 3, superCircuit: 1 },
    thermalSuit: { wovenFiber: 4, heatAlloy: 2, polymer: 2 },
    heatingCore: { thermalCrystal: 2, copperBar: 2 },
    iceBoots: { cobaltAlloy: 2, wovenFiber: 2 },
    sealedHelmet: { polymer: 2, wafer: 2 },
    lifeSupport2: { efficientCell: 2, titaniumBar: 2 },
  };
  for (const [id, d] of Object.entries(extremeGear))
    put(
      "ext_" + id,
      d.name,
      costs[id as keyof typeof costs],
      { kind: "environment", id: id as keyof typeof extremeGear },
      ["jetpack3", "zeroGPack"].includes(id)
        ? "quantumEngineering"
        : id === "jetpack1"
          ? "zeroGEngineering"
          : id.startsWith("universal")
            ? "universalEngineering"
            : [
                  "vacuumSuit",
                  "radShield",
                  "magneticBoots",
                  "zeroGStabilizer",
                  "advancedJetCore",
                  "cosmicShield",
                ].includes(id)
              ? "zeroGEngineering"
              : ["deepPressureSuit", "rebreather", "abyssLight"].includes(id)
                ? "pressureEngineering"
                : ["aquaSuit", "hydroPropulsor", "sonar"].includes(id)
                  ? "oceanEngineering"
                  : [
                        "thermalShield",
                        "cryoCooling",
                        "exoskeleton",
                        "magmaBoots",
                        "ashFilter",
                      ].includes(id)
                    ? "thermalEngineering"
                    : "cryoEngineering",
    );
  const materials: Partial<Record<ExtremeItem, Cost>> = {
    pressureAlloy: { pressureOre: 2, seaTitanium: 1 },
    hydroModule: { seaCore: 1, marineAlloy: 2 },
    bioPolymer: { aquaFiber: 2, deepEnzyme: 1 },
    marineCell: { seaCore: 2, deepCrystal: 1 },
    pressureUnit: { pressureCrystal: 2, superCircuit: 1 },
    lifeEfficiency: { alienPearl: 1, deepEnzyme: 2 },
    lightAlloy: { cosmicMetal: 2, helium: 1 },
    quantumCell: { moonCrystal: 2, quantumCircuit: 1 },
    gravityCircuit: { gravityCrystal: 2, gravityPart: 1 },
    advancedDrive: { meteorAlloy: 2, voidCore: 1 },
    longNav: { navCrystal: 2, quantumCircuit: 1 },
    spaceShield: { denseCosmicOre: 2, lightAlloy: 1 },
    ultraAlloy: { iridium: 2, tungsten: 2, heatAlloy: 1 },
    densePlate: { tungsten: 2, pureTitanium: 1 },
    thermalMaterial: { ceramicOre: 2, coolingCell: 1 },
    plasmaCell: { denseThermal: 2, refinedCell: 1 },
    geothermalModule: { geothermalCrystal: 2, reactorCircuit: 1 },
    exoParts: { densePlate: 2, superCircuit: 1 },
    engineParts: { heliosAlloy: 2, geothermalCrystal: 1 },
    cryoAlloy: { cryoOre: 2, pureMetal: 1 },
    coolingCell: { glacierCrystal: 2, coolantCore: 1 },
    superCircuit: { superconductor: 2, powerCircuit: 1 },
    lifeParts: { iceTissue: 2, polymer: 2 },
    advancedBattery: { blueCrystal: 2, superconductor: 1 },
  };
  for (const [id, cost] of Object.entries(materials))
    put(
      "ext_" + id,
      extremeItems[id as ExtremeItem].name,
      cost,
      { kind: "item", id: id as ItemId, count: 1 },
      [
        "pressureAlloy",
        "hydroModule",
        "bioPolymer",
        "marineCell",
        "pressureUnit",
        "lifeEfficiency",
      ].includes(id)
        ? "pressureEngineering"
        : [
              "lightAlloy",
              "quantumCell",
              "gravityCircuit",
              "advancedDrive",
              "longNav",
              "spaceShield",
            ].includes(id)
          ? "quantumEngineering"
          : [
                "cryoAlloy",
                "coolingCell",
                "superCircuit",
                "lifeParts",
                "advancedBattery",
              ].includes(id)
            ? "superconductivity"
            : "geothermalEngineering",
      "refinery",
    );
}
export const extremeQuests: {
  name: string;
  story: string;
  goals: [string, string, number][];
  xp: number;
}[] = [
  {
    name: "얼어붙은 신호",
    story:
      "PATHFINDER 이후 극저온 공학을 연구하고 사막 소재로 보온 장비를 준비하세요.",
    goals: [
      ["research_cryoEngineering", "극저온 공학 연구", 1],
      ["craft_ext_thermalSuit", "극저온 탐험복 제작", 1],
    ],
    xp: 1800,
  },
  {
    name: "얼음 너머의 세계",
    story: "FROSTIA에 착륙해 빙판과 극저온에 적응하세요.",
    goals: [
      ["land_frostia", "FROSTIA 착륙", 1],
      ["frostiaWilds", "빙하 탐험", 1],
      ["glacierCrystal", "빙하 결정 채집", 3],
    ],
    xp: 2200,
  },
  {
    name: "잃어버린 연구 기지",
    story: "얼음 아래 잠든 연구 기록과 거수를 찾으세요.",
    goals: [
      ["frostiaRuins", "연구 기지 발견", 1],
      ["archive_frostia", "연구 기록 조사", 1],
      ["seen_leviathan", "빙하의 거수 발견", 1],
    ],
    xp: 2600,
  },
  {
    name: "일곱 세계의 비밀",
    story: "빙하의 거수를 제압하고 다음 행성의 항법 기록을 확보하세요.",
    goals: [
      ["kill_leviathan", "GLACIAL LEVIATHAN 처치", 1],
      ["infernoNav", "항법 데이터 회수", 1],
    ],
    xp: 3200,
  },
];

extremeQuests.push(
  {
    name: "얼음의 기억",
    story: "고대 연구 자료와 냉각 기술로 열에 대응하세요.",
    goals: [
      ["archive_frostia", "고대 연구 자료 분석", 1],
      ["research_superconductivity", "초전도 공학 연구", 1],
      ["infernoNav", "INFERNO 좌표 확보", 1],
    ],
    xp: 3200,
  },
  {
    name: "불타는 세계",
    story: "HORIZON과 내열 장비를 준비하세요.",
    goals: [
      ["craft_ext_thermalShield", "내열 차폐복 제작", 1],
      ["horizon", "HORIZON 업그레이드", 1],
      ["land_inferno", "INFERNO 착륙", 1],
    ],
    xp: 3600,
  },
  {
    name: "무거운 발걸음",
    story: "고중력과 화산 지형에 적응하세요.",
    goals: [
      ["move_inferno", "고중력 점프 체험", 1],
      ["craft_ext_exoskeleton", "중력 외골격 제작", 1],
      ["infernoWilds", "용암의 강 탐험", 1],
    ],
    xp: 3800,
  },
  {
    name: "행성의 심장",
    story: "지열을 에너지로 바꾸는 문명의 흔적을 찾으세요.",
    goals: [
      ["geothermalCrystal", "지열 결정 채집", 3],
      ["infernoRuins", "헬리오스 발전 유적 발견", 1],
      ["archive_inferno", "발전 기술 기록 조사", 1],
    ],
    xp: 4000,
  },
  {
    name: "폭주하는 태양",
    story: "냉각 장치를 사용해 폭주하는 발전 코어를 안정시키세요.",
    goals: [
      ["kill_helios", "HELIOS DESTROYER 처치", 1],
      ["heliosCore", "고대 발전 코어 회수", 1],
    ],
    xp: 5000,
  },
);

extremeQuests.push(
  {
    name: "푸른 심연으로",
    story: "고열 세계의 기술로 바다에 진입하세요.",
    goals: [
      ["research_oceanEngineering", "해양 탐험 공학", 1],
      ["craft_ext_aquaSuit", "수중 탐험복 제작", 1],
      ["land_aquaria", "AQUARIA 착륙", 1],
    ],
    xp: 5200,
  },
  {
    name: "물살을 따라서",
    story: "산호초와 수중 생태를 탐험하세요.",
    goals: [
      ["swim_aquaria", "수중 자유 이동", 1],
      ["aquariaWilds", "발광 산호초 발견", 1],
      ["creature_aquaria", "해양 생명체 발견", 1],
    ],
    xp: 5400,
  },
  {
    name: "압력의 경계",
    story: "심해 장비로 수몰 도시를 찾으세요.",
    goals: [
      ["craft_ext_deepPressureSuit", "심해 내압복 제작", 1],
      ["aquariaDepths", "심해 해구 탐험", 1],
      ["archive_aquaria", "생명 적응 기록", 1],
    ],
    xp: 5600,
  },
  {
    name: "심해의 황제",
    story: "안전 포켓을 활용해 심해의 황제에 도전하세요.",
    goals: [
      ["kill_emperor", "ABYSSAL EMPEROR 처치", 1],
      ["abyssalCore", "심해 코어 확보", 1],
    ],
    xp: 6000,
  },
  {
    name: "고요한 위성",
    story: "진공과 저중력에 대비하세요.",
    goals: [
      ["craft_ext_vacuumSuit", "진공 탐험복 제작", 1],
      ["craft_ext_advancedJetCore", "제트팩 코어 제작", 1],
      ["land_lunaris", "LUNARIS 착륙", 1],
    ],
    xp: 6200,
  },
  {
    name: "중력에서 벗어나",
    story: "추진 에너지를 관리하며 관측소로 향하세요.",
    goals: [
      ["jet_lunaris", "제트팩 사용", 1],
      ["lunarisDepths", "별빛 관측소 발견", 1],
    ],
    xp: 6500,
  },
  {
    name: "별들의 좌표",
    story: "세 중력 제어 장치를 활성화하세요.",
    goals: [
      ["gravity_0", "첫 제어 장치", 1],
      ["gravity_1", "둘째 제어 장치", 1],
      ["gravity_2", "셋째 제어 장치", 1],
      ["archive_lunaris", "고대 항법 기록", 1],
    ],
    xp: 7000,
  },
  {
    name: "공허의 지배자",
    story: "중력장의 예고를 읽고 약점을 공략하세요.",
    goals: [
      ["kill_archon", "VOID ARCHON 처치", 1],
      ["voidArchonCore", "공허 코어 확보", 1],
    ],
    xp: 8000,
  },
  {
    name: "GENESIS",
    story:
      "네 고대 기록과 OMEGA 좌표가 하나의 메시지를 가리킵니다. 우리는 아직 끝나지 않았다.",
    goals: [
      ["archive_frostia", "빙하 기록", 1],
      ["archive_inferno", "발전 기록", 1],
      ["archive_aquaria", "생명 기록", 1],
      ["archive_lunaris", "항법 기록", 1],
      ["omegaCoordinates", "OMEGA 좌표 확보", 1],
    ],
    xp: 10000,
  },
);
