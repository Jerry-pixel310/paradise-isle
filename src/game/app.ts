/**
 * 游戏主编排：主循环（tick + 渲染）、输入（平移/缩放/点击）、
 * 三种场景模式（自家岛/NPC邻居岛/好友快照岛）、编辑摆放模式、事件分发。
 */
import type { ActionResult, GameEvent, GameState, NeighborState, RoomId } from '../core/types';
import { tickWorld } from '../core/state';
import { updateEnergy } from '../core/player';
import { buildTerrain, isFishable, terrainAt } from '../core/island';
import { dailyOrders } from '../core/orders';
import { cropView, harvest, plant, plotByUid, removePlot, till, water } from '../core/crops';
import { animalPhase, collectAnimal, feedAnimal } from '../core/animals';
import { clearWeed } from '../core/weeds';
import { gatherForage } from '../core/forage';
import { crossPollinate } from '../core/flower';
import { flowerColorName } from '../core/genes';
import {
  ROOMS, moveFurniture, placeFurniture, placedFurniture, removeFurniture, rotateFurniture,
} from '../core/interior';
import { addItem, removeItem } from '../core/player';
import { feedPet, petHungry, playPet, usePetSkill } from '../core/pets';
import { canPlace, movePlacement, placeBuilding, rotatePlacement, storePlacement } from '../core/build';
import { buyBuilding, refundBuilding } from '../core/economy';
import {
  helpChaseBeast, helpWater, helpWeed, neighborByDefId, prankNeighbor, simulateNeighbor, visitNeighbor,
} from '../core/social';
import { applyEvents } from '../core/quests';
import { calendarAt } from '../core/calendar';
import { tillCost, PRANK_PER_NEIGHBOR_PER_DAY } from '../core/balance';
import { PET_TRAIN_COOLDOWN_MS, PET_SKILL_COOLDOWN_MS } from '../core/balance';
import { buildingDef, cropDef, forageDef, furnitureDef, gameDef, itemDef, neighborDef, petDef, allBait, allCrops } from '../core/registry';
import { saveToSlot } from '../save/save';
import type { IslandSnapshot } from '../social/friendcode';
import { takeSnapshot } from '../social/friendcode';
import { createLiveHost, joinLive, type LiveGuest, type LiveHost, type LiveMessage } from '../social/live';
import { beautyScore } from '../core/build';
import { Renderer, sceneFromState, type RenderScene, type SceneActor } from '../render/renderer';
import { isoX, isoY } from '../render/iso';
import { Hud } from '../ui/hud';
import { hideActionMenu, isActionMenuOpen, showActionMenu, type MenuAction } from '../ui/actionMenu';
import { openInventory } from '../ui/panels/inventory';
import { openShop } from '../ui/panels/shop';
import { openQuestLog } from '../ui/panels/questlog';
import { openCollections } from '../ui/panels/collections';
import { openWardrobe } from '../ui/panels/wardrobe';
import { openNeighbors } from '../ui/panels/neighbors';
import { openSettings } from '../ui/panels/settings';
import { openCrafting } from '../ui/panels/crafting';
import { openHelp } from '../ui/panels/help';
import { openTutorial } from '../ui/panels/tutorial';
import { openMultiplayer } from '../ui/panels/multiplayer';
import { openFurniture } from '../ui/panels/furniture';
import { openFestival } from '../ui/panels/festival';
import { openPetContest } from '../ui/panels/contest';
import { openWeather } from '../ui/panels/weather';
import { openPondStock } from '../ui/panels/pond';
import { openRestaurant } from '../ui/panels/restaurant';
import { openBreedPanel } from '../ui/panels/breed';
import { openMuseum } from '../ui/panels/museum';
import { openCheckin } from '../ui/panels/checkin';
import { openProfile } from '../ui/panels/profile';
import { FURNITURE_EFFECT, furnitureUsedToday, useFurniture } from '../core/furnitureUse';
import { harvestPond, POND_MAX_STOCK, pondInfo } from '../core/pond';
import { closePanel, isPanelOpen } from '../ui/modal';
import { floatText, toast } from '../ui/toast';
import { hideTooltip, showTooltip } from '../ui/tooltip';
import { h, clearChildren } from '../ui/dom';
import { startFishing } from './fishing';
import { startBattle } from './battle';
import { startHunt } from './hunt';
import { startPetTraining } from './petTraining';
import { fmtDuration, t, tl } from '../i18n';
import { setMusic, setSound, sfx, startBgm } from '../audio/sound';

type Mode =
  | { kind: 'home' }
  | { kind: 'interior' }
  | { kind: 'neighbor'; ns: NeighborState }
  | { kind: 'snapshot'; snap: IslandSnapshot };

interface EditState {
  /** 摆放新建筑（已付费，取消需退款） */
  placing: string | null;
  /** 移动已有摆放 */
  movingUid: number | null;
  active: boolean;
}

const AUTOSAVE_MS = 30_000;

export class App {
  state: GameState;
  private slot: number;
  private renderer: Renderer;
  private hud: Hud;
  private mode: Mode = { kind: 'home' };
  private edit: EditState = { placing: null, movingUid: null, active: false };
  private hover: { tx: number; ty: number } | null = null;
  private playerActor: SceneActor;
  private walkTarget: { x: number; y: number; cb: (() => void) | null } | null = null;
  private lastSave = 0;
  private running = true;
  private raf = 0;
  /** 杂交：先选中一株成熟花卉，再点相邻同种花卉 */
  private crossFrom: number | null = null;
  /** 脚印追踪到的猎物 uid（高亮一段时间） */
  private trackedUid: number | null = null;
  /** 进入小屋前保存的岛屿相机 */
  private islandCamera: { cx: number; cy: number; zoom: number } | null = null;
  /** 室内：正在摆放/移动的家具 */
  private furniturePlacing: string | null = null;
  private furnitureMoving: number | null = null;
  private roomBar: HTMLElement;
  private onBackToTitle: () => void;
  /** 好友同游：房主/访客会话 */
  private liveHost: LiveHost | null = null;
  private liveHostCode: string | null = null;
  private liveGuestSession: LiveGuest | null = null;
  private liveGuestActor: SceneActor | null = null;
  private liveBroadcastTimer = 0;
  private lastLiveMoveAt = 0;

  constructor(canvas: HTMLCanvasElement, state: GameState, slot: number, onBackToTitle: () => void) {
    this.state = state;
    this.slot = slot;
    this.onBackToTitle = onBackToTitle;
    this.renderer = new Renderer(canvas);
    this.renderer.setPixelation(!!state.settings.pixelate);
    this.playerActor = {
      avatar: state.player.avatar,
      x: state.player.px,
      y: state.player.py,
      walking: false,
    };

    setSound(state.settings.sound);
    setMusic(state.settings.music);

    this.hud = new Hud({
      onOpen: (panel) => this.openPanel(panel),
      onToggleEdit: () => this.toggleEdit(),
      onGoHome: () => this.goHome(),
      onToggleInterior: () => this.toggleInterior(),
      onOpenWeather: () => this.openPanel('weather'),
      onOpenProfile: () => this.openPanel('profile'),
    });
    this.roomBar = h('div', { class: 'room-bar hidden' });
    document.body.append(this.roomBar);

    this.bindInput(canvas);
    this.renderer.centerOnIsland(sceneFromState(state));
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });
    // 首次交互解锁音频
    const unlock = (): void => {
      startBgm();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);

    this.lastSave = Date.now();
    // 调试/自动化测试钩子（不影响正常游玩）
    (window as unknown as Record<string, unknown>).__PI__ = {
      app: this,
      state: () => this.state,
      isFishable: (x: number, y: number) => isFishable(this.state, x, y),
      terrainAt: (x: number, y: number) => terrainAt(this.state, x, y),
      tileToScreen: (x: number, y: number) => [
        this.renderer.camera.sx(isoX(x, y)),
        this.renderer.camera.sy(isoY(x, y)),
      ],
      calendarAt: (createdAt: number, at: number) =>
        calendarAt(createdAt, at, this.state.seed),
      orders: () => dailyOrders(this.state, this.now()),
    };
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stopLive();
    this.hud.destroy();
  }

  now(): number {
    return Date.now();
  }

  save(): void {
    this.state.player.px = this.playerActor.x;
    this.state.player.py = this.playerActor.y;
    saveToSlot(this.state, this.slot, this.now());
  }

  // ---------------------------------------------------------------- 事件分发

  dispatch = (result: ActionResult): void => {
    const now = this.now();
    if (!result.ok) {
      if (result.reason) toast(t(result.reason), 'bad');
      sfx('error');
      return;
    }
    const events = result.events ?? [];
    const derived = applyEvents(this.state, events, now);
    for (const ev of [...events, ...derived]) this.handleEvent(ev);
  };

  private handleEvent(ev: GameEvent): void {
    const px = this.playerScreenX();
    const py = this.playerScreenY();
    switch (ev.type) {
      case 'levelUp':
        sfx('levelup');
        toast(t('msg.levelUp', { lv: ev.amount ?? 0 }), 'good');
        floatText(px, py - 80, `Lv.${ev.amount}!`, 'float-level');
        break;
      case 'harvest':
        sfx('harvest');
        floatText(px, py - 60, `+${ev.amount}`, 'float-good');
        break;
      case 'plant': sfx('plant'); break;
      case 'water': sfx('water'); break;
      case 'earnCoins':
        if ((ev.amount ?? 0) > 0) sfx('coin');
        break;
      case 'fishCatch': break; // 钓鱼弹窗自带
      case 'collectAnimal':
        sfx('harvest');
        floatText(px, py - 60, `+${ev.amount}`, 'float-good');
        break;
      case 'feedAnimal':
      case 'feedPet':
        sfx('eat');
        break;
      case 'playPet':
        sfx('happy');
        floatText(px, py - 60, '♥', 'float-heart');
        break;
      case 'place': sfx('build'); break;
      case 'breed': sfx('levelup'); break;
      case 'craft': sfx('build'); break;
      case 'expand':
        sfx('levelup');
        toast(t('msg.expanded'), 'good');
        this.renderer.centerOnIsland(sceneFromState(this.state));
        break;
      case 'achievement':
        sfx('quest');
        break;
      case 'toast': {
        if (ev.target === 'msg.questReady') {
          sfx('quest');
          toast(t('msg.questReady'), 'good');
        } else if (ev.target === 'msg.friendGift') {
          const persona = neighborDef(String(ev.data));
          toast(t('msg.friendGift', { name: tl(persona.name), n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.hireDone') {
          toast(t('msg.hireDone', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.forageGathered') {
          const item = itemDef(String(ev.data));
          toast(t('msg.forageGathered', { item: tl(item.name) }), 'good');
        } else if (ev.target === 'msg.crafted') {
          const item = itemDef(String(ev.data));
          toast(t('msg.crafted', { item: tl(item.name) }), 'good');
        } else if (ev.target === 'msg.ate') {
          const item = itemDef(String(ev.data));
          toast(t('msg.ate', { item: tl(item.name) }), 'good');
        } else if (ev.target === 'msg.crossNew' || ev.target === 'msg.crossOk') {
          const seed = itemDef(String(ev.data));
          toast(t(ev.target, { seed: tl(seed.name) }), ev.target === 'msg.crossNew' ? 'good' : 'info');
        } else if (ev.target === 'msg.dexReward') {
          toast(t('msg.dexReward', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.flowerBonus') {
          toast(t('msg.flowerBonus', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.giftGot') {
          toast(t('msg.giftGot', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.giftGiven') {
          const item = itemDef(String(ev.data));
          toast(t('msg.giftGiven', { item: tl(item.name), n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.neighborReward') {
          toast(t('msg.neighborReward', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.trainDone') {
          toast(t('msg.trainDone', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.petLevelUp') {
          toast(t('msg.petLevelUp', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.contestResult') {
          toast(t('msg.contestResult', { n: ev.amount ?? 0, rank: String(ev.data ?? '') }), 'good');
        } else if (ev.target === 'msg.chatDone') {
          toast(t('msg.chatDone'), 'bad');
        } else if (ev.target === 'msg.storyReward') {
          toast(t('msg.storyReward', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.dexMilestone') {
          toast(t('msg.dexMilestone', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.orderDelivered') {
          toast(t('msg.orderDelivered', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.skillScare' || ev.target === 'msg.skillLucky' || ev.target === 'msg.skillCheer') {
          toast(t(ev.target), 'good');
        } else if (ev.target === 'msg.skillGift') {
          const item = itemDef(String(ev.data));
          toast(t('msg.skillGift', { item: tl(item.name) }), 'good');
        } else if (ev.target === 'msg.ratingClaim') {
          toast(t('msg.ratingClaim', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.outfitSaved') {
          toast(t('msg.outfitSaved', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.outfitApplied') {
          toast(t('msg.outfitApplied'), 'good');
        } else if (ev.target === 'msg.qualityGold') {
          toast(t('msg.qualityGold', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.qualitySilver') {
          toast(t('msg.qualitySilver', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.birthdayGift') {
          const item = itemDef(String(ev.data));
          toast(t('msg.birthdayGift', { item: tl(item.name), n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.pondStocked') {
          const item = itemDef(String(ev.data));
          toast(t('msg.pondStocked', { item: tl(item.name) }), 'good');
        } else if (ev.target === 'msg.pondHarvest') {
          const item = itemDef(String(ev.data));
          toast(t('msg.pondHarvest', { item: tl(item.name), n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.menuUpdated') {
          const item = itemDef(String(ev.data));
          toast(t('msg.menuUpdated', { item: tl(item.name) }), 'good');
        } else if (ev.target === 'msg.restaurantServe') {
          toast(t('msg.restaurantServe', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.animalBorn') {
          toast(t('msg.animalBorn'), 'good');
        } else if (ev.target === 'msg.furnitureUse') {
          toast(t('msg.furnitureUse', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.museumDonated') {
          toast(t('msg.museumDonated'), 'good');
        } else if (ev.target === 'msg.museumMilestone') {
          toast(t('msg.museumMilestone', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.checkinClaim') {
          toast(t('msg.checkinClaim', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.titleEquipped') {
          toast(t('msg.titleEquipped'), 'good');
        } else if (ev.target === 'msg.activityClaimed') {
          toast(t('msg.activityClaimed', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.festivalBought') {
          const item = itemDef(String(ev.data));
          toast(t('msg.festivalBought', { item: tl(item.name) }), 'good');
        } else if (ev.target === 'msg.geneInherited') {
          toast(t('msg.geneInherited', { n: ev.amount ?? 0 }), 'good');
        } else if (ev.target === 'msg.furnitureBought' || ev.target === 'msg.furniturePlaced') {
          const furn = furnitureDef(String(ev.data));
          toast(t(ev.target, { name: tl(furn.name) }), 'good');
        } else if (ev.target) {
          toast(t(ev.target), 'info');
        }
        break;
      }
      default:
        break;
    }
  }

  private playerScreenX(): number {
    return this.renderer.camera.sx(isoX(this.playerActor.x, this.playerActor.y));
  }

  private playerScreenY(): number {
    return this.renderer.camera.sy(isoY(this.playerActor.x, this.playerActor.y));
  }

  // ---------------------------------------------------------------- 面板

  private openPanel(panel: string): void {
    hideActionMenu();
    switch (panel) {
      case 'inventory': openInventory(this.state, this.dispatch); break;
      case 'shop':
        openShop({
          state: this.state,
          now: () => this.now(),
          dispatch: this.dispatch,
          onPlaceBuilding: (defId) => this.beginPlaceBuilding(defId),
        });
        break;
      case 'quests': openQuestLog(this.state, () => this.now(), this.dispatch); break;
      case 'collections': openCollections(this.state, this.dispatch); break;
      case 'wardrobe':
        openWardrobe(this.state, (r) => {
          this.dispatch(r);
          this.playerActor.avatar = this.state.player.avatar;
        });
        break;
      case 'neighbors':
        openNeighbors({
          state: this.state,
          now: () => this.now(),
          dispatch: this.dispatch,
          onVisit: (npcId) => this.visitNpc(npcId),
          onVisitSnapshot: (snap) => this.visitSnapshot(snap),
          onLive: () => this.openPanel('multiplayer'),
        });
        break;
      case 'tutorial':
        openTutorial({ onOpen: (panel) => this.openPanel(panel) });
        break;
      case 'multiplayer':
        openMultiplayer({
          hostCode: this.liveHostCode,
          onCreateHost: () => this.startLiveHost(),
          onJoin: (code) => this.joinLiveRoom(code),
          onStop: () => this.stopLive(),
        });
        break;
      case 'settings':
        openSettings({
          state: this.state,
          now: () => this.now(),
          onLangChange: () => window.location.reload(),
          onImported: () => window.location.reload(),
          onTogglePixel: (on) => this.renderer.setPixelation(on),
          onOpenPanel: (panel) => this.openPanel(panel),
          onBackToTitle: () => {
            this.destroy();
            this.onBackToTitle();
          },
        });
        break;
      case 'crafting':
        openCrafting({ state: this.state, now: () => this.now(), dispatch: this.dispatch });
        break;
      case 'festival':
        openFestival({ state: this.state, now: () => this.now(), dispatch: this.dispatch });
        break;
      case 'weather':
        openWeather({ state: this.state, now: () => this.now() });
        break;
      case 'checkin':
        openCheckin({ state: this.state, now: () => this.now(), dispatch: this.dispatch });
        break;
      case 'profile':
        openProfile({ state: this.state, dispatch: this.dispatch });
        break;
    }
  }

  // ---------------------------------------------------------------- 编辑模式

  // ---------------------------------------------------------------- 好友同游

  private async startLiveHost(): Promise<string> {
    this.stopLive();
    const host = await createLiveHost(
      (msg) => {
        if (msg.type === 'move') {
          this.liveGuestActor = {
            avatar: msg.avatar,
            x: msg.x,
            y: msg.y,
            walking: false,
            name: msg.name,
          };
        } else if (msg.type === 'chat') {
          toast(`${msg.name}: ${msg.text}`, 'info');
        }
      },
      (name) => {
        this.broadcastLive();
        toast(t('mp.guestJoined', { name }), 'good');
      },
    );
    this.liveHost = host;
    this.liveHostCode = host.code;
    this.liveBroadcastTimer = window.setInterval(() => this.broadcastLive(), 1500);
    this.broadcastLive();
    return host.code;
  }

  private broadcastLive(): void {
    if (!this.liveHost) return;
    const snap = takeSnapshot(this.state, beautyScore(this.state), this.now());
    snap.player = { x: this.playerActor.x, y: this.playerActor.y };
    this.liveHost.broadcast({ type: 'snap', snap });
  }

  private async joinLiveRoom(code: string): Promise<void> {
    this.stopLive();
    const guest = await joinLive(
      code,
      (msg) => this.onLiveMessage(msg),
      { name: this.state.player.name, avatar: this.state.player.avatar },
      () => this.stopLive(),
    );
    this.liveGuestSession = guest;
    toast(t('mp.joined'), 'good');
  }

  private onLiveMessage(msg: LiveMessage): void {
    if (msg.type === 'snap') {
      closePanel();
      if (this.mode.kind === 'snapshot') {
        this.mode.snap = msg.snap;
      } else {
        this.enterLiveSnapshot(msg.snap);
      }
    } else if (msg.type === 'chat') {
      toast(`${msg.name}: ${msg.text}`, 'info');
    }
  }

  private enterLiveSnapshot(snap: IslandSnapshot): void {
    this.mode = { kind: 'snapshot', snap };
    const size = buildTerrain(snap.seed, snap.islandTier).length;
    this.playerActor.x = size / 2 + 2;
    this.playerActor.y = size / 2 + 2;
    this.playerActor.walking = false;
    this.walkTarget = null;
    this.renderer.camera.centerOnTile(size / 2, size / 2);
    this.hud.setVisiting(snap.name, false);
  }

  private stopLive(): void {
    if (this.liveBroadcastTimer) {
      window.clearInterval(this.liveBroadcastTimer);
      this.liveBroadcastTimer = 0;
    }
    this.liveHost?.stop();
    this.liveHost = null;
    this.liveHostCode = null;
    const wasGuest = !!this.liveGuestSession;
    this.liveGuestSession?.stop();
    this.liveGuestSession = null;
    this.liveGuestActor = null;
    if (wasGuest && this.mode.kind === 'snapshot') {
      this.mode = { kind: 'home' };
      this.walkTarget = null;
      this.hud.setVisiting(null, false);
      this.renderer.centerOnIsland(sceneFromState(this.state));
    }
  }

  private toggleEdit(): void {
    if (this.mode.kind !== 'home') return;
    this.edit.active = !this.edit.active;
    if (!this.edit.active) this.cancelEdit();
    this.hud.setEditActive(this.edit.active);
    sfx('click');
  }

  private cancelEdit(): void {
    if (this.edit.placing) {
      refundBuilding(this.state, this.edit.placing);
      toast(t('ui.cancel'), 'info');
    }
    this.edit.placing = null;
    this.edit.movingUid = null;
  }

  private beginPlaceBuilding(defId: string): void {
    const buyResult = buyBuilding(this.state, defId);
    if (!buyResult.ok) {
      this.dispatch(buyResult);
      return;
    }
    closePanel();
    this.edit.active = true;
    this.edit.placing = defId;
    this.edit.movingUid = null;
    this.hud.setEditActive(true);
  }

  // ---------------------------------------------------------------- 场景切换

  private visitNpc(npcId: string): void {
    if (this.mode.kind === 'interior') this.exitInterior();
    const ns = neighborByDefId(this.state, npcId);
    if (!ns) return;
    simulateNeighbor(ns, this.now());
    this.dispatch(visitNeighbor(this.state, npcId, this.now()));
    this.mode = { kind: 'neighbor', ns };
    this.edit.active = false;
    this.hud.setEditActive(false);
    const persona = neighborDef(npcId);
    this.hud.setVisiting(tl(persona.name), false);
    this.renderer.camera.centerOnTile(9, 9);
    // 邻居打招呼
    const g = persona.greetings[Math.floor(Math.random() * persona.greetings.length)];
    toast(`${tl(persona.name)}: ${tl(g)}`, 'info');
    sfx('happy');
  }

  private visitSnapshot(snap: IslandSnapshot): void {
    if (this.mode.kind === 'interior') this.exitInterior();
    this.mode = { kind: 'snapshot', snap };
    this.edit.active = false;
    this.hud.setEditActive(false);
    this.hud.setVisiting(snap.name, true);
    const size = buildTerrain(snap.seed, snap.islandTier).length;
    this.renderer.camera.centerOnTile(size / 2, size / 2);
    this.dispatch({ ok: true, events: [{ type: 'visit', target: 'snapshot', amount: 1 }] });
  }

  private goHome(): void {
    if (this.liveHost || this.liveGuestSession) {
      this.stopLive();
      return;
    }
    if (this.mode.kind === 'interior') { this.exitInterior(); return; }
    this.mode = { kind: 'home' };
    this.hud.setVisiting(null, false);
    this.renderer.centerOnIsland(sceneFromState(this.state));
  }

  // ---------------------------------------------------------------- 小屋室内

  private toggleInterior(): void {
    if (this.mode.kind === 'interior') { this.exitInterior(); return; }
    if (this.mode.kind !== 'home') return;
    const hasHouse = this.state.placements.some((p) => {
      try { return buildingDef(p.defId).category === 'house'; } catch { return false; }
    });
    if (!hasHouse) {
      toast(t('msg.noHouse'), 'bad');
      return;
    }
    const cam = this.renderer.camera;
    this.islandCamera = { cx: cam.cx, cy: cam.cy, zoom: cam.zoom };
    this.mode = { kind: 'interior' };
    this.edit.active = false;
    this.furniturePlacing = null;
    this.furnitureMoving = null;
    this.hud.setEditActive(false);
    this.hud.setInterior(true);
    this.renderRoomBar();
    this.roomBar.classList.remove('hidden');
    hideActionMenu();
    closePanel();
    cam.zoom = 1.4;
    cam.centerOnTile(5, 4.5);
    sfx('build');
  }

  private exitInterior(): void {
    if (this.mode.kind !== 'interior') return;
    this.mode = { kind: 'home' };
    this.furniturePlacing = null;
    this.furnitureMoving = null;
    this.roomBar.classList.add('hidden');
    this.hud.setInterior(false);
    hideActionMenu();
    closePanel();
    const cam = this.renderer.camera;
    if (this.islandCamera) {
      cam.cx = this.islandCamera.cx;
      cam.cy = this.islandCamera.cy;
      cam.zoom = this.islandCamera.zoom;
    } else {
      this.renderer.centerOnIsland(sceneFromState(this.state));
    }
    sfx('click');
  }

  private currentRoom(): RoomId {
    const room = this.state.interior.activeRoom;
    return room === 'bedroom' || room === 'kitchen' ? room : 'living';
  }

  private renderRoomBar(): void {
    clearChildren(this.roomBar);
    const active = this.currentRoom();
    for (const room of ROOMS) {
      this.roomBar.append(h('button', {
        class: `room-btn ${room === active ? 'active' : ''}`,
        onclick: () => this.switchRoom(room),
      }, t(`room.${room}`)));
    }
  }

  private switchRoom(room: RoomId): void {
    if (this.mode.kind !== 'interior' || this.currentRoom() === room) return;
    this.state.interior.activeRoom = room;
    this.furniturePlacing = null;
    this.furnitureMoving = null;
    hideActionMenu();
    closePanel();
    this.renderRoomBar();
  }

  private onClickInterior(tx: number, ty: number, sx: number, sy: number): void {
    const state = this.state;
    const room = this.currentRoom();
    const open = (): void => {
      openFurniture({
        state,
        room,
        dispatch: this.dispatch,
        onChange: () => {},
        onPlace: (id) => {
          this.furniturePlacing = id;
          this.furnitureMoving = null;
          closePanel();
          toast(t('furn.placingHint'), 'info');
        },
      });
    };

    if (this.furniturePlacing) {
      const id = this.furniturePlacing;
      const r = placeFurniture(state, room, id, tx, ty, 0);
      this.dispatch(r);
      if (r.ok) this.furniturePlacing = null;
      return;
    }
    if (this.furnitureMoving !== null) {
      const uid = this.furnitureMoving;
      const r = moveFurniture(state, room, uid, tx, ty);
      this.dispatch(r);
      if (r.ok) this.furnitureMoving = null;
      return;
    }

    const entry = placedFurniture(state, room).find((e) => {
      const { def, placement } = e;
      return tx >= placement.x && tx < placement.x + def.w
        && ty >= placement.y && ty < placement.y + def.h;
    });
    if (!entry) { open(); return; }

    const { def, placement } = entry;
    const actions: MenuAction[] = [];
    const effect = FURNITURE_EFFECT[def.slot];
    if (effect) {
      const used = furnitureUsedToday(state, placement.uid, this.now());
      actions.push({
        label: used
          ? `${t(`furn.use.${def.slot}`)} · ${t('furn.usedToday')}`
          : `${t(`furn.use.${def.slot}`)} +${effect}`,
        icon: 'fx:sleep',
        disabled: used,
        onClick: () => {
          if (used) return;
          this.dispatch(useFurniture(state, room, placement.uid, this.now()));
        },
      });
    }
    actions.push(
      {
        label: t('furn.move'),
        icon: `furn:${placement.defId}`,
        onClick: () => {
          this.furnitureMoving = placement.uid;
          toast(t('furn.movingHint'), 'info');
        },
      },
      {
        label: t('furn.rotate'),
        icon: 'fx:sparkle',
        onClick: () => this.dispatch(rotateFurniture(state, room, placement.uid)),
      },
      {
        label: t('furn.store'),
        icon: 'fx:sleep',
        onClick: () => this.dispatch(removeFurniture(state, room, placement.uid)),
      },
    );
    showActionMenu(sx, sy, tl(def.name), actions);
  }

  // ---------------------------------------------------------------- 输入

  private bindInput(canvas: HTMLCanvasElement): void {
    let downX = 0;
    let downY = 0;
    let lastPanX = 0;
    let lastPanY = 0;
    let dragging = false;
    let panning = false;
    // two-finger pinch zoom on touch screens (the mouse wheel does this on desktop)
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    let pinching = false;
    const spread = (): { d: number; mx: number; my: number } => {
      const [a, b] = [...pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    };

    canvas.addEventListener('pointerdown', (ev) => {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 2) {
        pinching = true;
        pinchDist = spread().d;
        return;
      }
      downX = ev.clientX;
      downY = ev.clientY;
      lastPanX = ev.clientX;
      lastPanY = ev.clientY;
      dragging = true;
      panning = false;
    });
    const dropPointer = (ev: PointerEvent): void => {
      pointers.delete(ev.pointerId);
    };
    window.addEventListener('pointercancel', dropPointer);
    canvas.addEventListener('pointermove', (ev) => {
      const cam = this.renderer.camera;
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinching) {
        if (pointers.size === 2) {
          const { d, mx, my } = spread();
          if (pinchDist > 0 && d > 0) cam.zoomAt(d / pinchDist, mx, my);
          pinchDist = d;
        }
        return;
      }
      if (dragging) {
        const dx = ev.clientX - downX;
        const dy = ev.clientY - downY;
        const threshold = ev.pointerType === 'mouse' ? 6 : 12;
        if (panning || Math.hypot(dx, dy) > threshold) {
          panning = true;
          cam.pan(ev.clientX - lastPanX, ev.clientY - lastPanY);
          lastPanX = ev.clientX;
          lastPanY = ev.clientY;
        }
      }
      const tile = cam.tileAt(ev.clientX, ev.clientY);
      this.hover = tile;
      if (!panning) this.updateTooltip(ev.clientX, ev.clientY, tile.tx, tile.ty);
    });
    canvas.addEventListener('pointerup', (ev) => {
      dropPointer(ev);
      dragging = false;
      if (pinching) {
        // a pinch never counts as a tap; wait until every finger is up
        if (pointers.size === 0) pinching = false;
        panning = false;
        return;
      }
      if (panning) {
        panning = false;
        return;
      }
      // 触屏：手指会遮住落点，稍微上移再取格子
      const tapY = ev.pointerType === 'mouse' ? ev.clientY : ev.clientY - 10;
      this.onClick(ev.clientX, tapY);
    });
    canvas.addEventListener('pointerleave', (ev) => {
      if (ev.pointerType === 'mouse') dropPointer(ev);
      dragging = false;
      this.hover = null;
      hideTooltip();
    });
    canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      this.renderer.camera.zoomAt(ev.deltaY < 0 ? 1.12 : 0.9, ev.clientX, ev.clientY);
    }, { passive: false });
    window.addEventListener('keydown', (ev) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      const k = ev.key.toLowerCase();
      if (k === 'escape') {
        if (isActionMenuOpen()) hideActionMenu();
        else if (isPanelOpen()) closePanel();
        else if (this.furniturePlacing || this.furnitureMoving !== null) {
          this.furniturePlacing = null;
          this.furnitureMoving = null;
        } else if (this.edit.placing || this.edit.movingUid) this.cancelEdit();
        else if (this.crossFrom !== null) this.crossFrom = null;
        return;
      }
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (isPanelOpen() || isActionMenuOpen()) return;
      switch (k) {
        case 'b': this.openPanel('inventory'); break;
        case 'k': this.openPanel('crafting'); break;
        case 'm': this.openPanel('shop'); break;
        case 'q': this.openPanel('quests'); break;
        case 'c': this.openPanel('collections'); break;
        case 'v': this.openPanel('wardrobe'); break;
        case 'n': this.openPanel('neighbors'); break;
        case 'e': this.toggleEdit(); break;
        case 'i': this.toggleInterior(); break;
        case '1': case '2': case '3':
          if (this.mode.kind === 'interior') {
            const room = ROOMS[Number(k) - 1];
            if (room) this.switchRoom(room);
          }
          break;
        case 'h': case '?': openHelp(); break;
        case 't': openTutorial({ onOpen: (panel) => this.openPanel(panel) }); break;
        default: break;
      }
    });
  }

  // ---------------------------------------------------------------- 点击处理

  private onClick(sx: number, sy: number): void {
    hideTooltip();
    if (isActionMenuOpen()) {
      hideActionMenu();
      return;
    }
    const { tx, ty } = this.renderer.camera.tileAt(sx, sy);
    const now = this.now();

    if (this.mode.kind === 'snapshot') {
      // 实时同游的访客可以自由走动；离线快照仍是纯参观
      if (this.liveGuestSession) {
        const size = buildTerrain(this.mode.snap.seed, this.mode.snap.islandTier).length;
        this.walkTarget = {
          x: Math.max(1, Math.min(size - 2, tx)),
          y: Math.max(1, Math.min(size - 2, ty)),
          cb: null,
        };
      }
      return;
    }
    if (this.mode.kind === 'neighbor') {
      this.onClickNeighbor(this.mode.ns, tx, ty, sx, sy, now);
      return;
    }
    if (this.mode.kind === 'interior') {
      this.onClickInterior(tx, ty, sx, sy);
      return;
    }

    // ---- 编辑摆放
    if (this.edit.placing) {
      const defId = this.edit.placing;
      if (canPlace(this.state, defId, tx, ty)) {
        this.edit.placing = null;
        this.dispatch(placeBuilding(this.state, defId, tx, ty));
      } else {
        toast(t('msg.cannotPlace'), 'bad');
      }
      return;
    }
    if (this.edit.movingUid !== null) {
      const uid = this.edit.movingUid;
      const pl = this.state.placements.find((p) => p.uid === uid);
      if (pl && canPlace(this.state, pl.defId, tx, ty, uid)) {
        this.edit.movingUid = null;
        this.dispatch(movePlacement(this.state, uid, tx, ty));
        sfx('build');
      } else {
        toast(t('msg.cannotPlace'), 'bad');
      }
      return;
    }

    const state = this.state;

    // 杂交等待中点了别处：取消
    if (this.crossFrom !== null && !state.plots.some((p) => p.x === tx && p.y === ty)) {
      this.crossFrom = null;
      toast(t('msg.crossCancel'), 'info');
    }

    // ---- 实体优先级：野兽 > 动物 > 宠物 > 杂草 > 农田 > 建筑(编辑) > 水(钓鱼) > 空草地
    const beast = state.beasts.find((b) => b.x === tx && b.y === ty);
    if (beast) {
      const def = beastDefSafe(beast.defId);
      this.walkNear(tx, ty, () => {
        showActionMenu(sx, sy, def, [{
          label: t('act.fight'),
          icon: 'fx:beast',
          onClick: () => startBattle(state, beast.uid, () => this.now(), this.dispatch, () => {}),
        }]);
      });
      return;
    }

    const prey = state.game.find((g) => g.x === tx && g.y === ty);
    if (prey) {
      const def = gameDef(prey.defId);
      this.walkNear(tx, ty, () => {
        showActionMenu(sx, sy, tl(def.name), [{
          label: t('act.hunt'),
          icon: `game:${def.id}`,
          onClick: () => startHunt(state, prey.uid, () => this.now(), this.dispatch, () => {}),
        }]);
      });
      return;
    }

    const trailOwner = state.game.find((g) =>
      (g.trail ?? []).some((t) => t.x === tx && t.y === ty && now - t.at < 3 * 60_000));
    if (trailOwner) {
      this.walkNear(tx, ty, () => {
        this.trackedUid = trailOwner.uid;
        const dir = directionKey(trailOwner.x - tx, trailOwner.y - ty);
        toast(t('msg.tracks', { dir: t(`dir.${dir}`) }), 'info');
        window.setTimeout(() => {
          if (this.trackedUid === trailOwner.uid) this.trackedUid = null;
        }, 12000);
      });
      return;
    }

    const animal = state.animals.find((a) => a.x === tx && a.y === ty);
    if (animal) {
      const phase = animalPhase(animal, now);
      const def = itemNameSafe(() => tl(cropOrAnimalName(animal.defId)));
      const actions: MenuAction[] = [];
      if (phase === 'baby') {
        actions.push({
          label: t('msg.animalBaby'),
          icon: 'fx:heart',
          disabled: true,
          onClick: () => {},
        });
      } else if (phase === 'hungry') {
        actions.push({ label: t('act.feed'), icon: 'fx:hungry', onClick: () => this.dispatch(feedAnimal(state, animal.uid, this.now())) });
      } else if (phase === 'ready') {
        actions.push({ label: t('act.collect'), icon: 'fx:ready', onClick: () => this.dispatch(collectAnimal(state, animal.uid, this.now())) });
      } else {
        actions.push({ label: `⏳ ${fmtDuration(animalEtaSafe(animal, now))}`, disabled: true, onClick: () => {} });
      }
      const mates = state.animals.filter((a) =>
        a.uid !== animal.uid && a.defId === animal.defId && animalPhase(a, now) !== 'baby');
      if (mates.length > 0) {
        actions.push({
          label: t('act.breed'),
          icon: 'fx:heart',
          onClick: () => openBreedPanel({
            state, uid: animal.uid, now: () => this.now(), dispatch: this.dispatch,
          }),
        });
      }
      this.walkNear(tx, ty, () => showActionMenu(sx, sy, def, actions));
      return;
    }

    const pet = state.pets.find((p) => Math.round(p.x) === tx && Math.round(p.y) === ty);
    if (pet) {
      const actions: MenuAction[] = [];
      if (petHungry(pet, now)) {
        actions.push({ label: t('act.pet.feed'), icon: 'fx:hungry', onClick: () => this.dispatch(feedPet(state, pet.uid, this.now())) });
      }
      actions.push({ label: t('act.pet.play'), icon: 'fx:heart', onClick: () => this.dispatch(playPet(state, pet.uid, this.now())) });
      const skillCd = (pet.skillUsedAt ?? 0) + PET_SKILL_COOLDOWN_MS - now;
      if (skillCd <= 0) {
        actions.push({
          label: t('act.pet.skill'),
          icon: 'fx:sparkle',
          onClick: () => this.dispatch(usePetSkill(state, pet.uid, this.now())),
        });
      } else {
        actions.push({ label: `⏳ ${fmtDuration(skillCd)}`, disabled: true, onClick: () => {} });
      }
      actions.push({
        label: t('act.pet.contest'),
        icon: 'fx:ready',
        onClick: () => openPetContest({ state, now: () => this.now(), dispatch: this.dispatch }),
      });
      const trainCd = (pet.lastTrainedAt ?? 0) + PET_TRAIN_COOLDOWN_MS - now;
      if (trainCd <= 0) {
        actions.push({
          label: t('act.pet.train'),
          icon: 'fx:sparkle',
          onClick: () => startPetTraining(state, pet.uid, () => this.now(), this.dispatch, () => {}),
        });
      } else {
        actions.push({ label: `⏳ ${fmtDuration(trainCd)}`, disabled: true, onClick: () => {} });
      }
      this.walkNear(tx, ty, () => showActionMenu(sx, sy, `${pet.name} Lv.${petLevelSafe(pet.xp)}`, actions));
      return;
    }

    const spot = state.forage.find((f) => f.x === tx && f.y === ty);
    if (spot) {
      const def = forageDef(spot.defId);
      this.walkNear(tx, ty, () => {
        showActionMenu(sx, sy, tl(def.name), [{
          label: t('act.gather'),
          icon: `icon:${def.itemId}`,
          onClick: () => this.dispatch(gatherForage(state, spot.uid, this.now())),
        }]);
      });
      return;
    }

    const weed = state.weeds.find((w) => w.x === tx && w.y === ty);
    if (weed) {
      this.walkNear(tx, ty, () => this.dispatch(clearWeed(state, weed.uid, this.now())));
      return;
    }

    const plot = state.plots.find((p) => p.x === tx && p.y === ty);
    if (plot) {
      this.onClickPlot(plot.uid, tx, ty, sx, sy, now);
      return;
    }

    const vase = state.placements.find((p) => p.defId === 'bld_vase' && p.x === tx && p.y === ty);
    if (vase && !this.edit.active) {
      this.openVaseMenu(vase, sx, sy);
      return;
    }

    const museum = state.placements.find((p) => {
      const d = buildingDef(p.defId);
      return p.defId === 'bld_museum' && tx >= p.x && tx < p.x + d.w && ty >= p.y && ty < p.y + d.h;
    });
    if (museum && !this.edit.active) {
      this.walkNear(tx, ty, () => {
        showActionMenu(sx, sy, tl(buildingDef('bld_museum').name), [{
          label: t('act.museum'),
          icon: 'bld:bld_museum',
          onClick: () => openMuseum({ state, dispatch: this.dispatch }),
        }]);
      });
      return;
    }

    const restaurant = state.placements.find((p) => {
      const d = buildingDef(p.defId);
      return p.defId === 'bld_restaurant' && tx >= p.x && tx < p.x + d.w && ty >= p.y && ty < p.y + d.h;
    });
    if (restaurant && !this.edit.active) {
      this.walkNear(tx, ty, () => {
        showActionMenu(sx, sy, tl(buildingDef('bld_restaurant').name), [{
          label: t('act.restaurant'),
          icon: 'bld:bld_restaurant',
          onClick: () => openRestaurant({
            state, uid: restaurant.uid, now: () => this.now(), dispatch: this.dispatch,
          }),
        }]);
      });
      return;
    }

    const fishpond = state.placements.find((p) => {
      const d = buildingDef(p.defId);
      return p.defId === 'bld_fishpond' && tx >= p.x && tx < p.x + d.w && ty >= p.y && ty < p.y + d.h;
    });
    if (fishpond && !this.edit.active) {
      this.walkNear(tx, ty, () => this.openPondMenu(fishpond.uid, sx, sy));
      return;
    }

    const house = state.placements.find((p) => {
      const d = buildingDef(p.defId);
      return d.category === 'house' && tx >= p.x && tx < p.x + d.w && ty >= p.y && ty < p.y + d.h;
    });    if (house) {
      const def = buildingDef(house.defId);
      this.walkNear(tx, ty, () => {
        showActionMenu(sx, sy, tl(def.name), [{
          label: t('hud.house'),
          icon: `bld:${house.defId}`,
          onClick: () => this.toggleInterior(),
        }]);
      });
      return;
    }

    const placement = state.placements.find((p) => {
      const def = buildingDef(p.defId);
      return tx >= p.x && tx < p.x + def.w && ty >= p.y && ty < p.y + def.h;
    });
    if (placement && this.edit.active) {
      const def = buildingDef(placement.defId);
      showActionMenu(sx, sy, tl(def.name), [
        { label: '↔ ' + t('hud.edit'), onClick: () => { this.edit.movingUid = placement.uid; } },
        { label: '🔄', onClick: () => this.dispatch(rotatePlacement(state, placement.uid)) },
        { label: `📦 +${Math.floor(def.price / 2)}`, onClick: () => { this.dispatch(storePlacement(state, placement.uid)); sfx('coin'); } },
      ]);
      return;
    }

    if (isFishable(state, tx, ty)) {
      const baits = allBait().filter((b) => (state.inventory[b.itemId] || 0) > 0);
      this.walkNear(tx, ty, () => {
        if (baits.length === 0) {
          startFishing(state, () => this.now(), this.dispatch);
          return;
        }
        const actions: MenuAction[] = [
          {
            label: t('fish.noBait'),
            icon: 'fish:fish_sardine',
            onClick: () => startFishing(state, () => this.now(), this.dispatch),
          },
          ...baits.map((b) => ({
            label: `${tl(b.name)} ×${state.inventory[b.itemId] || 0}`,
            icon: `icon:${b.itemId}`,
            onClick: () => startFishing(state, () => this.now(), this.dispatch, b.id),
          })),
        ];
        showActionMenu(sx, sy, t('act.fish'), actions);
      });
      return;
    }

    if (terrainAt(state, tx, ty) === 'grass') {
      const cost = tillCost(state.plots.length);
      this.walkNear(tx, ty, () => {
        showActionMenu(sx, sy, `(${tx}, ${ty})`, [{
          label: t('act.till', { coins: cost }),
          icon: 'tile:plot:dry',
          onClick: () => this.dispatch(till(state, tx, ty, this.now())),
        }]);
      });
    }
  }

  private onClickPlot(plotUid: number, tx: number, ty: number, sx: number, sy: number, now: number): void {
    const state = this.state;
    const plot = plotByUid(state, plotUid);
    if (!plot) return;
    // 杂交第二步：点相邻的同种成熟花
    if (this.crossFrom !== null) {
      const from = this.crossFrom;
      this.crossFrom = null;
      if (from !== plotUid) {
        this.dispatch(crossPollinate(state, from, plotUid, this.now()));
        return;
      }
    }
    const actions: MenuAction[] = [];
    let title = t('msg.noCrop');
    if (!plot.crop) {
      title = `🌱 (${tx}, ${ty})`;
      // 列出背包里已有种子
      const seeds = allCrops().filter((c) => (state.inventory[c.seedId] || 0) > 0);
      for (const c of seeds.slice(0, 6)) {
        actions.push({
          label: `${tl(c.name)} ×${state.inventory[c.seedId]}`,
          icon: `icon:${c.seedId}`,
          onClick: () => this.dispatch(plant(state, plotUid, c.id, this.now())),
        });
      }
      actions.push({
        label: `🛒 ${t('shop.seeds')}`,
        onClick: () => this.openPanel('shop'),
      });
      actions.push({
        label: t('act.removePlot'),
        onClick: () => this.dispatch(removePlot(state, plotUid)),
      });
    } else {
      const crop = plot.crop;
      const def = cropDef(crop.defId);
      const view = cropView(crop, now);
      title = def.isFlower && crop.genes
        ? `${t('flower.label', {
            color: tl(flowerColorName(crop.genes)),
            name: tl(def.name),
          })} · ${t('msg.generation', { n: crop.genes.generation })}`
        : tl(def.name);
      if (view.stage === 'ready') {
        actions.push({ label: t('act.harvest'), icon: 'fx:ready', onClick: () => this.dispatch(harvest(state, plotUid, this.now())) });
        if (def.isFlower) {
          actions.push({
            label: t('act.cross'),
            icon: 'fx:heart',
            onClick: () => {
              this.crossFrom = plotUid;
              toast(t('msg.crossPick'), 'info');
            },
          });
        }
      } else if (view.stage === 'withered') {
        actions.push({ label: t('act.clear'), icon: 'fx:hungry', onClick: () => this.dispatch(harvest(state, plotUid, this.now())) });
      } else {
        actions.push({ label: `⏳ ${fmtDuration(view.etaMs)}`, disabled: true, onClick: () => {} });
        actions.push({ label: t('act.water'), icon: 'fx:drop', onClick: () => this.dispatch(water(state, plotUid, this.now())) });
      }
    }
    this.walkNear(tx, ty, () => showActionMenu(sx, sy, title, actions));
  }

  /** 花瓶：插入/取下一束花 */
  private openPondMenu(uid: number, sx: number, sy: number): void {
    const state = this.state;
    const info = pondInfo(state, uid, this.now());
    const actions: MenuAction[] = [];
    if (info.pond) {
      actions.push(info.ready
        ? {
            label: t('pond.harvest'),
            icon: `fish:${info.pond.fishId}`,
            onClick: () => this.dispatch(harvestPond(state, uid, this.now())),
          }
        : {
            label: `⏳ ${fmtDuration(info.remaining)}`,
            disabled: true,
            onClick: () => {},
          });
    }
    if (!info.pond || info.pond.count < POND_MAX_STOCK) {
      actions.push({
        label: t('pond.stock'),
        icon: 'fish:fish_sardine',
        onClick: () => openPondStock({
          state, uid, now: () => this.now(), dispatch: this.dispatch,
        }),
      });
    }
    showActionMenu(sx, sy, tl(buildingDef('bld_fishpond').name), actions);
  }

  private openVaseMenu(vase: { uid: number; defId: string; variant?: string }, sx: number, sy: number): void {
    const state = this.state;
    const def = buildingDef(vase.defId);
    const actions: MenuAction[] = [];
    if (vase.variant) {
      const vid = vase.variant;
      actions.push({
        label: t('act.takeFlower', { item: tl(itemDef(vid).name) }),
        icon: `icon:${vid}`,
        onClick: () => {
          addItem(state, vid, 1);
          vase.variant = undefined;
          toast(t('msg.vaseTaken'), 'info');
          sfx('click');
        },
      });
    }
    const bouquets = Object.keys(state.inventory)
      .filter((id) => (state.inventory[id] || 0) > 0 && itemDef(id).category === 'bouquet');
    for (const id of bouquets.slice(0, 5)) {
      actions.push({
        label: t('act.insertFlower', { item: tl(itemDef(id).name) }),
        icon: `icon:${id}`,
        onClick: () => {
          if (removeItem(state, id, 1)) {
            if (vase.variant) addItem(state, vase.variant, 1);
            vase.variant = id;
            toast(t('msg.vaseFlower'), 'good');
            sfx('happy');
          }
        },
      });
    }
    if (!vase.variant && bouquets.length === 0) {
      actions.push({ label: t('msg.noBouquet'), disabled: true, onClick: () => {} });
    }
    showActionMenu(sx, sy, tl(def.name), actions);
  }

  /** 鼠标悬停时的实体信息提示 */
  private updateTooltip(sx: number, sy: number, tx: number, ty: number): void {
    if (this.mode.kind === 'interior') { hideTooltip(); return; }
    const s = this.state;
    const now = this.now();
    let text = '';
    const hunt = s.game.find((g) => g.x === tx && g.y === ty);
    if (hunt) {
      text = `${tl(gameDef(hunt.defId).name)} · ${t('act.hunt')} · ${'❤'.repeat(Math.max(1, hunt.hp))}`;
    } else {
      const beast = s.beasts.find((b) => b.x === tx && b.y === ty);
      const animal = s.animals.find((a) => a.x === tx && a.y === ty);
      const pet = s.pets.find((p) => Math.round(p.x) === tx && Math.round(p.y) === ty);
      const spot = s.forage.find((f) => f.x === tx && f.y === ty);
      const plot = s.plots.find((p) => p.x === tx && p.y === ty);
      const placement = s.placements.find((p) => {
        const d = buildingDef(p.defId);
        return tx >= p.x && tx < p.x + d.w && ty >= p.y && ty < p.y + d.h;
      });
      if (beast) {
        text = `${tl(_beastDef(beast.defId).name)} · ${t('act.fight')}`;
      } else if (animal) {
        const phase = animalPhase(animal, now);
        const eta = animalEtaSafe(animal, now);
        const stateText = phase === 'baby' ? t('tip.baby')
          : phase === 'ready' ? t('tip.ready')
            : phase === 'hungry' ? t('tip.hungry') : `${t('tip.producing')} ${fmtDuration(eta)}`;
        text = `${tl(_animalDef(animal.defId).name)} · ${stateText}`;
      } else if (pet) {
        text = `${pet.name} · ${t('tip.pet')}`;
      } else if (spot) {
        text = `${tl(forageDef(spot.defId).name)} · ${t('act.gather')}`;
      } else if (plot?.crop) {
        const view = cropView(plot.crop, now);
        const cropDefNow = cropDef(plot.crop.defId);
        const name = cropDefNow.isFlower && plot.crop.genes
          ? t('flower.label', {
              color: tl(flowerColorName(plot.crop.genes)),
              name: tl(cropDefNow.name),
            })
          : tl(cropDefNow.name);
        const stateText = view.stage === 'ready' ? t('tip.ready')
          : view.stage === 'withered' ? t('tip.withered') : fmtDuration(view.etaMs);
        text = `${name} · ${stateText}`;
      } else if (placement) {
        text = `${tl(buildingDef(placement.defId).name)}${placement.variant ? ` · ${tl(itemDef(placement.variant).name)}` : ''}`;
      } else if (isFishable(s, tx, ty)) {
        text = t('tip.fish');
      }
    }
    if (text) showTooltip(text, sx, sy);
    else hideTooltip();
    this.renderer.canvas.style.cursor = text ? 'pointer' : 'grab';
  }

  private onClickNeighbor(ns: NeighborState, tx: number, ty: number, sx: number, sy: number, now: number): void {
    simulateNeighbor(ns, now);
    const persona = neighborDef(ns.defId);

    const beast = ns.beasts.find((b) => b.x === tx && b.y === ty);
    if (beast) {
      showActionMenu(sx, sy, tl(persona.name), [{
        label: t('act.chase'), icon: 'fx:beast',
        onClick: () => this.dispatch(helpChaseBeast(this.state, ns, beast.uid, this.now())),
      }]);
      return;
    }
    const weed = ns.weeds.find((w) => w.x === tx && w.y === ty);
    if (weed) {
      showActionMenu(sx, sy, tl(persona.name), [{
        label: t('act.weed'), icon: 'weed',
        onClick: () => this.dispatch(helpWeed(this.state, ns, weed.uid, this.now())),
      }]);
      return;
    }
    const plot = ns.plots.find((p) => p.x === tx && p.y === ty);
    if (plot && plot.crop) {
      const view = cropView(plot.crop, now);
      const actions: MenuAction[] = [];
      if (view.stage !== 'ready' && view.stage !== 'withered') {
        actions.push({
          label: t('act.helpWater'), icon: 'fx:drop',
          onClick: () => this.dispatch(helpWater(this.state, ns, plot.uid, this.now())),
        });
      }
      actions.push({
        label: `${t('act.prank')} (${Math.max(0, PRANK_PER_NEIGHBOR_PER_DAY - ns.prankedToday)})`,
        icon: 'fx:sparkle',
        onClick: () => this.doPrank(ns),
      });
      showActionMenu(sx, sy, tl(cropDef(plot.crop.defId).name), actions);
      return;
    }
    // 空地：捣蛋选项
    showActionMenu(sx, sy, tl(persona.name), [{
      label: `${t('act.prank')} (${Math.max(0, PRANK_PER_NEIGHBOR_PER_DAY - ns.prankedToday)})`,
      icon: 'fx:sparkle',
      onClick: () => this.doPrank(ns),
    }]);
  }

  private doPrank(ns: NeighborState): void {
    const persona = neighborDef(ns.defId);
    const result = prankNeighbor(this.state, ns, this.now());
    this.dispatch(result);
    if (result.ok) {
      const angry = persona.angry[Math.floor(Math.random() * persona.angry.length)];
      toast(`${tl(persona.name)}: ${tl(angry)}`, 'info');
      sfx('happy');
    }
  }

  // ---------------------------------------------------------------- 行走

  private walkNear(tx: number, ty: number, cb: () => void): void {
    if (this.mode.kind !== 'home') {
      cb();
      return;
    }
    const dist = Math.hypot(this.playerActor.x - tx, this.playerActor.y - ty);
    if (dist <= 1.6) {
      cb();
      return;
    }
    // 目标：邻近一格
    const dx = this.playerActor.x - tx;
    const dy = this.playerActor.y - ty;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    this.walkTarget = {
      x: tx + (dx / len) * 0.9,
      y: ty + (dy / len) * 0.9,
      cb,
    };
  }

  // ---------------------------------------------------------------- 主循环

  private lastFrame = 0;

  private loop = (): void => {
    if (!this.running) return;
    const now = this.now();
    const dt = this.lastFrame ? Math.min(100, now - this.lastFrame) : 16;
    this.lastFrame = now;

    // 玩家实时位置（猎物 AI 需要）
    this.state.player.px = this.playerActor.x;
    this.state.player.py = this.playerActor.y;

    // 世界推进
    const tickSummary = tickWorld(this.state, now);
    updateEnergy(this.state, now);
    if (tickSummary.beastsArrived > 0 && this.mode.kind === 'home') {
      sfx('roar');
      toast(t('msg.beastArrive'), 'bad');
    }
    if (tickSummary.rained && this.mode.kind === 'home') {
      toast(t('msg.rainWater'), 'info');
    }
    if (tickSummary.gameArrived > 0 && this.mode.kind === 'home') {
      toast(t('msg.gameArrive'), 'info');
    }
    if (tickSummary.petGift) {
      const pet = this.state.pets.find((p) => petDef(p.defId).skill === 'find_gift');
      toast(t('msg.petGift', {
        pet: pet?.name ?? '?', item: tl(itemDef(tickSummary.petGift).name),
      }), 'good');
    }

    // 行走插值
    if (this.walkTarget) {
      const speed = 4.6 / 1000; // 格/毫秒
      const dx = this.walkTarget.x - this.playerActor.x;
      const dy = this.walkTarget.y - this.playerActor.y;
      const dist = Math.hypot(dx, dy);
      const step = speed * dt;
      if (dist <= step) {
        this.playerActor.x = this.walkTarget.x;
        this.playerActor.y = this.walkTarget.y;
        const cb = this.walkTarget.cb;
        this.walkTarget = null;
        this.playerActor.walking = false;
        cb?.();
        if (this.liveGuestSession) {
          this.liveGuestSession.send({
            type: 'move',
            x: this.playerActor.x,
            y: this.playerActor.y,
            name: this.state.player.name,
            avatar: this.state.player.avatar,
          });
        }
      } else {
        this.playerActor.x += (dx / dist) * step;
        this.playerActor.y += (dy / dist) * step;
        this.playerActor.walking = true;
        if (this.liveGuestSession && now - this.lastLiveMoveAt > 250) {
          this.lastLiveMoveAt = now;
          this.liveGuestSession.send({
            type: 'move',
            x: this.playerActor.x,
            y: this.playerActor.y,
            name: this.state.player.name,
            avatar: this.state.player.avatar,
          });
        }
      }
    }

    // 场景组装
    if (this.mode.kind === 'interior') {
      const room = this.currentRoom();
      this.renderer.renderInterior({
        room,
        furniture: placedFurniture(this.state, room).map(({ def, placement }) => ({
          def, x: placement.x, y: placement.y, rot: placement.rot,
        })),
        avatar: this.state.player.avatar,
        name: this.state.player.name,
      }, now);
    } else {
      const scene = this.buildScene(now);
      this.renderer.render(scene, now);
    }
    this.hud.update(this.state, now);

    // 自动保存
    if (now - this.lastSave > AUTOSAVE_MS) {
      this.lastSave = now;
      this.save();
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private buildScene(now: number): RenderScene {
    if (this.mode.kind === 'neighbor') {
      const ns = this.mode.ns;
      const persona = neighborDef(ns.defId);
      return {
        seed: persona.islandSeed,
        islandTier: 1,
        createdAt: this.state.createdAt,
        plots: ns.plots,
        placements: ns.placements,
        animals: [],
        beasts: ns.beasts,
        forage: [],
        game: [],
        weeds: ns.weeds,
        pets: [],
        actors: [
          { avatar: persona.avatar, x: 9, y: 7, walking: false, name: tl(persona.name) },
          { ...this.playerActor, x: 10, y: 10, walking: false },
        ],
        hover: null,
        ghost: null,
      };
    }
    if (this.mode.kind === 'snapshot') {
      const snap = this.mode.snap;
      const size = buildTerrain(snap.seed, snap.islandTier).length;
      return {
        seed: snap.seed,
        islandTier: snap.islandTier,
        createdAt: this.state.createdAt,
        plots: snap.plots,
        placements: snap.placements,
        animals: snap.animals.map((a, i) => ({ uid: -1 - i, defId: a.defId, x: a.x, y: a.y, fedAt: now })),
        beasts: [],
        forage: [],
        game: [],
        weeds: [],
        pets: snap.pets.map((p, i) => ({ defId: p.defId, x: Math.floor(size / 2) + i, y: Math.floor(size / 2) + 3 })),
        actors: [
          {
            avatar: snap.avatar,
            x: snap.player?.x ?? size / 2,
            y: snap.player?.y ?? size / 2,
            walking: false,
            name: snap.name,
          },
          ...(this.liveGuestSession ? [{
            ...this.playerActor,
            name: this.state.player.name,
          }] : []),
        ],
        hover: null,
        ghost: null,
      };
    }

    const scene = sceneFromState(this.state);
    this.playerActor.avatar = this.state.player.avatar;
    scene.actors = [{ ...this.playerActor, name: this.state.player.name }];
    if (this.liveGuestActor) scene.actors.push({ ...this.liveGuestActor });
    if (this.trackedUid !== null) {
      const tracked = this.state.game.find((g) => g.uid === this.trackedUid);
      scene.tracked = tracked ? { x: tracked.x, y: tracked.y } : null;
    }
    if (this.hover) {
      const ok = this.edit.placing
        ? canPlace(this.state, this.edit.placing, this.hover.tx, this.hover.ty)
        : this.edit.movingUid !== null
          ? movableOk(this.state, this.edit.movingUid, this.hover.tx, this.hover.ty)
          : terrainAt(this.state, this.hover.tx, this.hover.ty) !== 'water' || isFishable(this.state, this.hover.tx, this.hover.ty);
      scene.hover = { tx: this.hover.tx, ty: this.hover.ty, ok };
      if (this.edit.placing) {
        scene.ghost = { defId: this.edit.placing, tx: this.hover.tx, ty: this.hover.ty, ok };
      } else if (this.edit.movingUid !== null) {
        const pl = this.state.placements.find((p) => p.uid === this.edit.movingUid);
        if (pl) scene.ghost = { defId: pl.defId, tx: this.hover.tx, ty: this.hover.ty, ok };
      }
    }
    return scene;
  }
}

// ---------------------------------------------------------------- 小助手

import { beastDef as _beastDef, animalDef as _animalDef } from '../core/registry';
import { petLevel } from '../core/balance';
import { animalEta } from '../core/animals';

function beastDefSafe(defId: string): string {
  try { return tl(_beastDef(defId).name); } catch { return defId; }
}

function cropOrAnimalName(defId: string): { zh: string; en: string } {
  try { return _animalDef(defId).name; } catch { return { zh: defId, en: defId }; }
}

function itemNameSafe(fn: () => string): string {
  try { return fn(); } catch { return '?'; }
}

function animalEtaSafe(a: { defId: string; fedAt: number | null; uid: number; x: number; y: number }, now: number): number {
  try { return animalEta(a, now); } catch { return 0; }
}

function petLevelSafe(xp: number): number {
  return petLevel(xp);
}

function movableOk(state: GameState, uid: number, tx: number, ty: number): boolean {
  const pl = state.placements.find((p) => p.uid === uid);
  if (!pl) return false;
  return canPlace(state, pl.defId, tx, ty, uid);
}

/** 8 方向：0=东，顺时针 */
function directionKey(dx: number, dy: number): string {
  const dirs = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
  const a = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
  return dirs[Math.round(a / (Math.PI / 4)) % 8];
}
