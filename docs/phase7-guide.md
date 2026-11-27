# ASTROTOPIA — Phase 7 · PATH OF THE EXPLORER

Phaser 3 / TypeScript / Vite 기반 2D 우주 탐험 RPG입니다. 기존 여섯 행성, 산업, 우주선, 장비와 공통 스킬을 유지하면서 **6개 직업, 12개 전문화 경로, 스킬 트리와 궁극기**를 추가했습니다. 새 게임은 ROOKIE PIONEER로 시작합니다.

## 실행

```powershell
npm install
npm run dev
npm test
npm run build
npm run test:e2e
npm run test:production
```

개발 미리보기는 `http://127.0.0.1:5180`이며 포트를 자동 변경하지 않습니다. 프로덕션 검증은 먼저 빌드해야 합니다. 게임은 상대 URL을 사용하며 외부 도메인이나 DNS 설정이 필요하지 않습니다.

기존 행성·환경·항해 설명은 [Phase 6 가이드](docs/phase6-guide.md), 산업·건설은 [Phase 4 가이드](docs/phase4-guide.md), 우주선 수리는 [Phase 5 가이드](docs/phase5-guide.md)를 참고하세요.

## 직업 선택과 전직

Lv.10부터 안전한 기지 또는 우주선에서 **V → 직업과 전직**을 엽니다. 여섯 교관의 설명을 확인하고 직업 체험을 통과한 다음 1차 전직을 선택하세요. 초기 터미널은 무료이므로 아카데미 건설이 첫 전직을 막지 않습니다. B → 연구에서 PIONEER ACADEMY를 건설할 수도 있습니다.

체험은 별도 월드에서 진행됩니다. 종료하면 원래 레벨·장비·자원·기지·직업을 복원하며, 임시 아이템이나 경험치를 가져오지 않습니다. 체험 중 자동 저장도 원래 캐릭터를 저장합니다. 제한은 180초, 공통 목표는 스킬 3종 사용·6회 명중·1기 격파입니다. Guardian/Cyber Blade는 반격 1회, Explorer는 350px 이동과 스캔도 필요합니다. 성공 후 화면의 체험 종료 버튼을 누르세요. 시간이 초과되거나 실패하면 원본으로 복귀하여 재도전할 수 있습니다.

Lv.30에서 2차 시험을 통과한 뒤 전문화를 선택하고, Lv.60에서 3차 시험을 통과하여 최종 직업으로 성장합니다. 기존 고레벨 캐릭터도 레벨을 유지한 채 순서대로 전직합니다.

| 기본 직업   | 전문화 → 최종 직업                    | 궁극기            |
| ----------- | ------------------------------------- | ----------------- |
| Guardian    | Sentinel → Aegis Commander            | Aegis Fortress    |
| Guardian    | Destroyer → Titan Vanguard            | Titan Breaker     |
| Ranger      | Sharpshooter → Star Sniper            | Celestial Strike  |
| Ranger      | Gunner → Plasma Reaper                | Plasma Tempest    |
| Engineer    | Mechanic → Mech Architect             | Titan Mech        |
| Engineer    | Robotics Specialist → Drone Commander | Mechanical Legion |
| Scientist   | Physicist → Quantum Master            | Quantum Collapse  |
| Scientist   | Biotechnologist → Genesis Alchemist   | Genesis Bloom     |
| Explorer    | Pathfinder → Galactic Voyager         | Horizon Breaker   |
| Explorer    | Prospector → Cosmic Seeker            | Cosmic Discovery  |
| Cyber Blade | Duelist → Phantom Blade               | Phantom Eclipse   |
| Cyber Blade | Berserker → Nova Slayer               | Supernova Blade   |

## 직업별 전투

| 직업        | 기본 액티브 4종                                               | 전투 방식                                                                       |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Guardian    | Shield Bash / Gravity Smash / Fortress Mode / Counter Impact  | 중장갑, 원형 충격파, 피해 감소 태세, 짧은 반격 창. 해머·캐논 숙련.              |
| Ranger      | Precision Shot / Rapid Burst / Evasive Fire / Target Mark     | 관통 사격과 연속 탄환, 후방 회피, 표적 추가 피해. 총기 숙련.                    |
| Engineer    | Combat Drone / Portable Turret / Repair Field / Electric Trap | 추종 드론, 고정 포탑, 수리, 접근 함정. 소환 장비는 전체 최대 4개.               |
| Scientist   | Energy Orb / Gravity Well / Elemental Shift / Analysis Field  | 관통 구체, 흡인 후 폭발, 냉기·전기·독성 전환, 표적 분석. 보스는 강제 이동 저항. |
| Explorer    | Hyper Dash / Jet Boost / Scan Pulse / Pioneer Strike          | 충돌을 유지하는 대시, 공중·수중 추진, 광맥 스캔, 기동 공격.                     |
| Cyber Blade | Cyber Slash / Flash Step / Aerial Blade / Blade Counter       | 검 연계, 대시 참격, 공중 2연격, 타이밍 반격. 검 공격 속도와 콤보 강화.          |

12개 전문화마다 고급 스킬 3종과 궁극기 1종이 있습니다. 일부 기술은 공통 공격 판정과 효과 엔진을 공유합니다. 모든 직업은 기존 무기, 채굴, 건설, 연구와 행성 탐험을 사용할 수 있습니다.

## 스킬 트리·게이지·조작

V → 스킬 트리에서 COMBAT / MASTERY / PIONEER 분야에 SP를 배분합니다. 기본 액티브 4종은 전직 시 Lv.1로 무료 지급됩니다. 일반 스킬은 최대 5단계, 숙련 패시브는 10단계입니다. 피해 기술은 강화 단계당 위력이 8% 증가하고, 비공격 기술은 EP 효율이 개선됩니다. 스킬의 요구 레벨·전직·선행 기술·비용을 UI에서 확인할 수 있습니다.

SP는 Lv.10부터 레벨마다 1, 최초 1차·2차·3차 전직에 각각 5·5·10, 직업 퀘스트마다 2개입니다. 누적 지급량을 현재 레벨과 최초 전직 기록으로 계산하여 재접속이나 직업 변경으로 중복 지급하지 않습니다.

Q/E/R/T는 액티브 4칸, **6은 궁극기**, U는 기존 우주선 메뉴입니다. Shift 회피, J 기본 공격, K 무기 특수 공격, C 장비, V 아카데미, H 회복을 유지합니다. V 하단의 공통 스킬 목록에서 BOOST DASH, ENERGY BURST, PLASMA WAVE, AERIAL BOOST, ENERGY SHIELD, ORBITAL STRIKE를 같은 슬롯에 다시 배치할 수 있습니다.

직업 게이지는 최대 100입니다. 명중·방어·속성 연계·위협 근처 기동으로 충전하며 훈련 인형은 게이지나 숙련도를 주지 않습니다. 궁극기는 3차 전직 후 학습해야 하며 게이지 100과 EP를 사용하고 기본 재사용 시간은 100초입니다. 소환체·지연 공격·태세는 사망과 지역 이동 시 정리합니다. 회피형 직업 스킬은 공통 대시와 재사용 시간을 공유합니다.

지상 충격파는 수중·공중에서 원형 에너지 공격으로 작동합니다. 공중 참격은 점프 또는 수중에서 사용하세요. 제트 추진은 위치를 순간 변경하지 않으며 기존 충돌과 경계를 유지합니다.

## 숙련·장비·변경

직업 숙련은 최대 Lv.20입니다. 실제 적에게 피해를 준 직업 스킬, 최초 도전 등급 향상, 직업 퀘스트로 경험치를 얻습니다. 교관 도전은 BRONZE / SILVER / GOLD / PLATINUM으로 평가하며 이미 받은 등급 보상을 반복 지급하지 않습니다.

V → 숙련과 프리셋에서 여섯 직업의 전투복과 코어를 제작합니다. 2차는 희귀 등급(철 8·회로 2), 3차는 영웅 등급(초합금 4·초전도 회로 2)입니다. TITAN ARMOR, STAR HUNTER SUIT, MECHANIC EXOSUIT, QUANTUM LAB SUIT, HORIZON SUIT, NOVA COMBAT SUIT는 기존 장착·확정 강화와 호환됩니다. 환경 보호 모듈은 별도로 유지됩니다.

최초 스킬 초기화는 무료, 이후 50 CR이며 사용 SP를 반환합니다. 기본 직업 변경은 해당 체험 통과 후 100 CR, 전문화 변경은 50 CR입니다. 변경 후 60초 제한이 있고 전투·보스·침공·항해·위험 지역에서는 변경할 수 없습니다. 이전 직업의 숙련도는 보존하고 액티브·패시브는 현재 직업만 적용합니다.

보스·사냥·방어·채굴·수중·저중력 프리셋 6개를 저장할 수 있습니다. 현재 직업에 맞는 스킬, 실제 보유 장비, 무기와 환경 모듈만 적용하며 쿨다운을 초기화하거나 HP·EP·산소를 충전하지 않습니다.

Guardian은 침공 중 방어 시설 피해와 내구 방어, Ranger는 전투 경험치, Cyber Blade는 검 전투 경험치를 보조합니다. Engineer는 건설·자동 생산 속도, Scientist는 연구 RP 비용, Explorer는 이동·환경 노출·채굴·제트 소비를 보조합니다. 개척 보너스는 5~15% 범위이며 현재 직업에서 동적으로 계산됩니다. C에서 기본/장비/직업·연구·환경 능력치 차이를 확인할 수 있습니다.

## 퀘스트와 재도전

57~64번 직업 퀘스트는 V → 숙련과 프리셋에서 확인하고 보상을 수령합니다. 기존 메인 퀘스트와 독립적이라 후반 행성 진행 전에 전직할 수 있습니다. 마지막 임무는 LUNARIS의 GENESIS 기록과 연결됩니다.

V → 훈련과 재도전에서 실제 처치한 7개 기존 보스에 NORMAL / HARD / MASTERY로 도전합니다. HARD는 예고된 추적 중력장, MASTERY는 교차 광선도 추가합니다. 이 모드는 원래 스토리와 전리품을 보존하는 아카데미 재현이며 최초 성공 숙련·RP만 반영합니다. 환경 장비는 직접 준비하세요.

## 저장·검증·범위

저장 버전 7이며 브라우저 키 `astrotopia.save.v1`을 유지합니다. 버전 1~6을 변환하고 이전 버전을 백업합니다. 잘못된 직업 스킬 슬롯은 공통 슬롯으로 복원하며 과도한 SP 소비, 잘못된 직업·장비·게이지는 검증합니다. 기존 레벨·기지·연구·행성·퀘스트를 보존합니다.

[검증 보고서](docs/verification.md)에 실제 테스트와 측정 범위를 기록합니다. 절차적 2D 아트와 합성 효과음을 사용합니다. 교관은 대화 카드와 초상으로 제공하며 월드 내 NPC 이동 AI는 없습니다. 도전은 공유 훈련 맵에 직업별 목표를 적용한 프로토타입이며 독립적인 여섯 스토리 던전은 아닙니다. 궁극기·고급 기술 일부는 같은 효과 계열을 공유하고 장시간 직업 밸런스 검증은 추가로 필요합니다. 온라인·PvP·유료 강화는 없습니다. OMEGA 탐험과 엔딩은 이어지는 Phase 8 작업입니다.
