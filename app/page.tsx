"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TREE_LAYOUT = [
  [8,13],[17,24],[29,12],[42,19],[55,11],[72,18],[86,11],[11,56],[24,69],
  [38,54],[52,67],[66,50],[80,64],[91,48],[6,84],[33,86],[62,87],[88,82],
] as const;
const BANK_POSITION = { x: 69, y: 39 };
const SAVE_KEY = "tallowmere-save-v1";
const CHOP_MS = 1700;
const RESPAWN_MS = 11_000;
const LOG_XP = 125;
const MAX_INVENTORY_LOGS = 28;
const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000;

type Action = "idle" | "walking-tree" | "chopping" | "walking-bank" | "banking" | "waiting";
type Panel = "inventory" | "skills" | "equipment";
type TreeState = { id: number; x: number; y: number; charges: number; maxCharges: number; respawnAt: number };
type GameState = {
  xp: number; inventoryLogs: number; bankLogs: number; afk: boolean; action: Action;
  targetTreeId: number | null; nextActionAt: number; characterX: number; characterY: number;
  trees: TreeState[]; now: number;
};
type OfflineSummary = { elapsed: number; logs: number; xp: number };

function makeTrees(): TreeState[] {
  return TREE_LAYOUT.map(([x,y], id) => {
    const maxCharges = 5 + ((id * 7 + 2) % 6);
    return { id, x, y, charges: maxCharges, maxCharges, respawnAt: 0 };
  });
}

function initialGame(): GameState {
  return { xp:0, inventoryLogs:0, bankLogs:0, afk:true, action:"idle", targetTreeId:null,
    nextActionAt:0, characterX:55, characterY:45, trees:makeTrees(), now:Date.now() };
}

function xpForLevel(level: number) {
  let points = 0;
  for (let i = 1; i < level; i += 1) points += Math.floor(i + 300 * Math.pow(2, i / 7));
  return Math.floor(points / 4);
}

const MAX_XP = xpForLevel(99);

function levelFromXp(xp: number) {
  for (let level = 99; level >= 2; level -= 1) if (xp >= xpForLevel(level)) return level;
  return 1;
}

function distance(ax:number, ay:number, bx:number, by:number) {
  return Math.hypot(ax - bx, ay - by);
}

function walkTime(ax:number, ay:number, bx:number, by:number) {
  return Math.min(2400, Math.max(650, distance(ax, ay, bx, by) * 24));
}

function availableTree(state: GameState) {
  return state.trees.filter(tree => tree.charges > 0)
    .sort((a,b) => distance(state.characterX,state.characterY,a.x,a.y) - distance(state.characterX,state.characterY,b.x,b.y))[0];
}

function moveToTree(state: GameState, tree: TreeState, now: number): GameState {
  return { ...state, action:"walking-tree", targetTreeId:tree.id, characterX:tree.x + 1.8,
    characterY:tree.y + 3, nextActionAt:now + walkTime(state.characterX,state.characterY,tree.x,tree.y) };
}

function moveToNextTree(state: GameState, now: number): GameState {
  const tree = availableTree(state);
  return tree ? moveToTree(state, tree, now) : { ...state, action:"waiting", targetTreeId:null, nextActionAt:now + 1000 };
}

function moveToBank(state: GameState, now: number): GameState {
  return { ...state, action:"walking-bank", targetTreeId:null, characterX:BANK_POSITION.x,
    characterY:BANK_POSITION.y, nextActionAt:now + walkTime(state.characterX,state.characterY,BANK_POSITION.x,BANK_POSITION.y) };
}

function formatNumber(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60); const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

function PixelTree({ tree, selected, chopping, now, onChoose }:{tree:TreeState;selected:boolean;chopping:boolean;now:number;onChoose:()=>void}) {
  const depleted = tree.charges <= 0;
  const seconds = Math.max(0, Math.ceil((tree.respawnAt - now) / 1000));
  return (
    <button className={`pixel-tree ${depleted ? "pixel-tree--stump" : ""} ${selected ? "pixel-tree--selected" : ""} ${chopping ? "pixel-tree--chopping" : ""}`}
      style={{ left:`${tree.x}%`, top:`${tree.y}%` }} onClick={onChoose} disabled={depleted}
      aria-label={depleted ? `Tree respawning in ${seconds} seconds` : `Tree with about ${tree.charges} logs remaining`}>
      {depleted ? <><span className="stump-shadow"/><span className="tree-stump"/><small>{seconds}s</small></> : <>
        <span className="tree-shadow"/><span className="tree-trunk"/><span className="tree-crown tree-crown--back"/>
        <span className="tree-crown tree-crown--front"/><span className="tree-shine"/>
        {selected && <span className="tree-target"/>}
        {chopping && <span className="wood-chips"><i/><b/><em/></span>}
      </>}
    </button>
  );
}

function AxeIcon({ small=false }:{small?:boolean}) {
  return <span className={`axe-icon ${small ? "axe-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
}

function LogIcon({ small=false }:{small?:boolean}) {
  return <span className={`log-icon ${small ? "log-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
}

function InventoryGrid({ logs }:{logs:number}) {
  return <div className="inventory-grid" aria-label={`Inventory, ${logs} of 28 slots used`}>
    {Array.from({length:28}).map((_,index) => {
      const isLog = index < logs;
      return <div className={`inventory-slot ${isLog ? "inventory-slot--filled" : ""}`} key={index}>
        {isLog && <><LogIcon/><span className="item-amount">1</span><span className="sr-only">Logs</span></>}
      </div>;
    })}
  </div>;
}

export default function Home() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [hydrated, setHydrated] = useState(false);
  const [panel, setPanel] = useState<Panel>("inventory");
  const [welcome, setWelcome] = useState(true);
  const [bankOpen, setBankOpen] = useState(false);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const latestGame = useRef(game);

  useEffect(() => { latestGame.current = game; }, [game]);

  useEffect(() => {
    const now = Date.now();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GameState> & { lastSeen?:number };
        const base = initialGame();
        const savedTrees = Array.isArray(saved.trees) && saved.trees.length === TREE_LAYOUT.length ? saved.trees : base.trees;
        const elapsed = Math.min(MAX_OFFLINE_MS, Math.max(0, now - (saved.lastSeen ?? now)));
        const offlineLogs = saved.afk && elapsed > 10_000 ? Math.floor(elapsed / 2400) : 0;
        const offlineXp = offlineLogs * LOG_XP;
        setGame({ ...base, xp:Math.min(MAX_XP,(saved.xp ?? 0) + offlineXp), inventoryLogs:Math.min(MAX_INVENTORY_LOGS,saved.inventoryLogs ?? 0),
          bankLogs:(saved.bankLogs ?? 0) + offlineLogs, afk:saved.afk ?? true,
          characterX:saved.characterX ?? base.characterX, characterY:saved.characterY ?? base.characterY,
          trees:savedTrees.map((tree,index) => tree.respawnAt && tree.respawnAt <= now ? { ...tree, charges:tree.maxCharges || base.trees[index].maxCharges, respawnAt:0 } : tree), now });
        if (offlineLogs > 0) setOffline({ elapsed, logs:offlineLogs, xp:offlineXp });
        setWelcome(false);
      }
    } catch { localStorage.removeItem(SAVE_KEY); }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const save = () => {
      const current = latestGame.current;
      localStorage.setItem(SAVE_KEY, JSON.stringify({ xp:current.xp, inventoryLogs:current.inventoryLogs,
        bankLogs:current.bankLogs, afk:current.afk, characterX:current.characterX, characterY:current.characterY,
        trees:current.trees, lastSeen:Date.now() }));
    };
    const saveTimer = window.setInterval(save, 2500);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", save);
    return () => { save(); window.clearInterval(saveTimer); window.removeEventListener("beforeunload",save); document.removeEventListener("visibilitychange",save); };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setInterval(() => setGame(previous => {
      const now = Date.now();
      let state: GameState = { ...previous, now, trees:previous.trees.map(tree => tree.charges <= 0 && tree.respawnAt <= now
        ? { ...tree, charges:tree.maxCharges, respawnAt:0 } : tree) };
      if (now < state.nextActionAt) return state;

      if (state.action === "idle") {
        if (!state.afk) return state;
        return state.inventoryLogs >= MAX_INVENTORY_LOGS ? moveToBank(state,now) : moveToNextTree(state,now);
      }
      if (state.action === "waiting") return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle" };
      if (state.action === "walking-tree") {
        const tree = state.trees.find(item => item.id === state.targetTreeId);
        return tree && tree.charges > 0 ? { ...state, action:"chopping", nextActionAt:now + CHOP_MS }
          : state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
      }
      if (state.action === "chopping") {
        const index = state.trees.findIndex(item => item.id === state.targetTreeId);
        const tree = state.trees[index];
        if (!tree || tree.charges <= 0) return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
        const remaining = tree.charges - 1;
        const trees = state.trees.slice();
        trees[index] = { ...tree, charges:remaining, respawnAt:remaining === 0 ? now + RESPAWN_MS : 0 };
        state = { ...state, trees, inventoryLogs:state.inventoryLogs + 1, xp:Math.min(MAX_XP,state.xp + LOG_XP) };
        if (state.inventoryLogs >= MAX_INVENTORY_LOGS) return state.afk ? moveToBank(state,now) : { ...state, action:"idle", targetTreeId:null };
        if (remaining === 0) return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
        return { ...state, nextActionAt:now + CHOP_MS };
      }
      if (state.action === "walking-bank") return { ...state, action:"banking", nextActionAt:now + 650 };
      if (state.action === "banking") {
        state = { ...state, bankLogs:state.bankLogs + state.inventoryLogs, inventoryLogs:0 };
        return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", nextActionAt:0 };
      }
      return state;
    }), 250);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  const level = levelFromXp(game.xp);
  const levelStart = xpForLevel(level);
  const nextLevelXp = level >= 99 ? MAX_XP : xpForLevel(level + 1);
  const xpProgress = level >= 99 ? 100 : Math.max(0,Math.min(100,((game.xp-levelStart)/(nextLevelXp-levelStart))*100));
  const actionProgress = game.action === "chopping" ? Math.max(4,Math.min(100,(1-(game.nextActionAt-game.now)/CHOP_MS)*100)) : xpProgress;
  const actionText = useMemo(() => {
    if (game.action === "walking-tree") return "Walking to a tree";
    if (game.action === "chopping") return "Chopping logs";
    if (game.action === "walking-bank") return "Walking to the bank";
    if (game.action === "banking") return "Depositing logs";
    if (game.action === "waiting") return "Waiting for a tree";
    if (game.inventoryLogs >= MAX_INVENTORY_LOGS) return "Inventory full";
    return game.afk ? "Finding a tree" : "Ready to explore";
  },[game.action,game.afk,game.inventoryLogs]);

  const chooseTree = (tree:TreeState) => {
    if (tree.charges <= 0 || game.inventoryLogs >= MAX_INVENTORY_LOGS) return;
    setWelcome(false); setBankOpen(false);
    setGame(previous => moveToTree({ ...previous, now:Date.now() }, tree, Date.now()));
  };

  const toggleAfk = () => setGame(previous => {
    const now = Date.now();
    if (previous.afk) return { ...previous, afk:false, action:"idle", targetTreeId:null, nextActionAt:0, now };
    const enabled = { ...previous, afk:true, now };
    return enabled.inventoryLogs >= MAX_INVENTORY_LOGS ? moveToBank(enabled,now) : moveToNextTree(enabled,now);
  });

  const visitBank = () => {
    setWelcome(false); setBankOpen(true);
    if (game.inventoryLogs > 0) setGame(previous => moveToBank(previous,Date.now()));
  };

  const begin = () => {
    setWelcome(false);
    setGame(previous => {
      const tree = availableTree(previous); return tree ? moveToTree(previous,tree,Date.now()) : previous;
    });
  };

  const worldScale = 1.8;
  const cameraFloor = -((worldScale - 1) / worldScale) * 100;
  const cameraCenter = 50 / worldScale;
  const cameraX = Math.min(0, Math.max(cameraFloor, cameraCenter - game.characterX));
  const cameraY = Math.min(0, Math.max(cameraFloor, cameraCenter - game.characterY));

  return <main className="game-shell">
    <header className="topbar">
      <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><i/><b/></span><div><h1>Tallowmere</h1><p>The old woods remember</p></div></div>
      <div className="player-stats" aria-label="Player stats">
        <div className="stat-pill"><span className="stat-icon stat-icon--star">✦</span><div><small>Woodcutting</small><strong>Level {level}</strong></div></div>
        <div className="stat-pill"><span className="stat-icon stat-icon--log"/><div><small>Banked logs</small><strong>{formatNumber(game.bankLogs)}</strong></div></div>
        <div className="world-size"><span/>100 × 100 TILES</div>
      </div>
    </header>

    <section className="world-card" aria-label="Tallowmere forest game world">
      <div className="world-map">
        <div className="world-layer" style={{ transform:`translate(${cameraX}%, ${cameraY}%)` }}>
          <div className="world-edge world-edge--top"/><div className="world-edge world-edge--left"/>
          <div className="dirt-path dirt-path--vertical"/><div className="dirt-path dirt-path--branch"/>
          <div className="pond"><span className="pond-ripple pond-ripple--one"/><span className="pond-ripple pond-ripple--two"/></div>
          <div className="world-fog world-fog--one"/><div className="world-fog world-fog--two"/>
          <div className="ruin-stones ruin-stones--one"><i/><b/><em/></div>
          <div className="ruin-stones ruin-stones--two"><i/><b/><em/></div>
          <div className="dead-brush dead-brush--one"><i/><b/><em/></div>
          <div className="dead-brush dead-brush--two"><i/><b/><em/></div>
          <div className="mushroom-patch mushroom-patch--one"><i/><b/><em/></div>
          <div className="mushroom-patch mushroom-patch--two"><i/><b/><em/></div>
          <div className="road-sign"><i/><b/><span>Bank</span></div>
          <div className="flowers flowers--one">· ✦ ·</div><div className="flowers flowers--two">✦ ·</div>
          {game.trees.map(tree => <PixelTree key={tree.id} tree={tree} selected={game.targetTreeId===tree.id} chopping={game.action==="chopping" && game.targetTreeId===tree.id} now={game.now} onChoose={() => chooseTree(tree)}/>)}

          <button className="bank-building" type="button" aria-label="Enter Tallowmere bank" onClick={visitBank}>
            <span className="bank-shadow"/><span className="bank-roof"><i/><b/></span><span className="bank-wall"/>
            <span className="bank-door"/><span className="bank-window bank-window--left"/><span className="bank-window bank-window--right"/><strong>BANK</strong>
          </button>

          <div className={`player-character player-character--${game.action}`} style={{left:`${game.characterX}%`,top:`${game.characterY}%`}} aria-label={`Your character is ${actionText.toLowerCase()}`}>
            <span className="character-shadow"/><span className="character-hair"/><span className="character-head"/><span className="character-body"/>
            <span className="character-cloak"/><span className="character-belt"/><span className="character-arm"/><span className="character-legs"/><span className="character-axe"><i/><b/></span>
          </div>
        </div>

        <div className="region-plaque" aria-hidden="true"><small>WESTERN MARCH</small><strong>Tallowmere Wood</strong></div>

        {welcome && <aside className="welcome-card">
          <button className="welcome-close" type="button" aria-label="Close welcome card" onClick={() => setWelcome(false)}>×</button>
          <span className="eyebrow">THE OLD ROAD AWAITS</span><h2>Enter Tallowmere Wood</h2>
          <p>Choose a tree and put your bronze axe to work. AFK mode will roam the wood, bank your logs, and keep watch while you are away.</p>
          <button className="welcome-action" type="button" onClick={begin}>Enter the wood <span>›</span></button>
        </aside>}

        {bankOpen && <aside className="bank-panel" aria-label="Tallowmere bank interior">
          <div className="bank-panel__header"><div><small>TALLOWMERE BANK</small><h2>Your vault</h2></div><button type="button" onClick={() => setBankOpen(false)} aria-label="Close bank">×</button></div>
          <div className="bank-slot"><LogIcon/><div><strong>Logs</strong><small>Stored safely</small></div><b>{formatNumber(game.bankLogs)}</b></div>
          <button className="bank-deposit" type="button" disabled={game.inventoryLogs===0} onClick={visitBank}>{game.inventoryLogs>0 ? `Deposit ${game.inventoryLogs} logs` : "Inventory is empty"}</button>
          <p>AFK mode returns here automatically when your 28-slot inventory is full.</p>
        </aside>}

        <div className="status-dock" aria-live="polite">
          <span className="status-avatar"><i/></span><div className="status-copy"><small>Current action</small><strong>{actionText}</strong></div>
          <div className="status-divider"/><div className="xp-summary"><small>Woodcutting XP</small><strong>{formatNumber(game.xp)} <span>/ {level>=99 ? "MAX" : formatNumber(nextLevelXp)} XP</span></strong></div>
          <div className="xp-bar" title={game.action==="chopping" ? "Chop progress" : "Level progress"}><span style={{width:`${actionProgress}%`}}/></div>
        </div>

        <aside className="side-panel">
          <div className="panel-tabs" aria-label="Game panels">
            <button className={`panel-tab ${panel==="skills" ? "panel-tab--active" : ""}`} type="button" aria-label="Woodcutting skill" aria-pressed={panel==="skills"} onClick={() => setPanel("skills")}><span className="tab-axe"><i/><b/></span></button>
            <button className={`panel-tab ${panel==="equipment" ? "panel-tab--active" : ""}`} type="button" aria-label="Equipment" aria-pressed={panel==="equipment"} onClick={() => setPanel("equipment")}><span className="tab-equipment"><i/><b/></span></button>
            <button className={`panel-tab ${panel==="inventory" ? "panel-tab--active" : ""}`} type="button" aria-label="Inventory" aria-pressed={panel==="inventory"} onClick={() => setPanel("inventory")}><span className="tab-bag"><i/></span></button>
          </div>
          <div className="inventory-panel">
            {panel === "inventory" ? <>
              <div className="panel-heading"><div><span>Inventory</span><small>{game.inventoryLogs} / 28 slots</small></div><b>{28-game.inventoryLogs}</b></div>
              <InventoryGrid logs={game.inventoryLogs}/>
              <div className="item-detail"><LogIcon small/><div><strong>Logs</strong><small>{game.inventoryLogs ? `${game.inventoryLogs} ready to bank` : "Your pack is ready"}</small></div></div>
            </> : panel === "skills" ? <div className="skill-panel">
              <div className="panel-heading"><div><span>Skills</span><small>1 skill available</small></div><b>1</b></div>
              <div className="skill-card"><span className="skill-card__icon"><span className="tab-axe"><i/><b/></span></span><div className="skill-card__copy"><small>WOODCUTTING</small><strong>Level {level}</strong><span>{formatNumber(game.xp)} XP</span></div></div>
              <div className="skill-progress"><div><span>Level {level}</span><b>{level>=99 ? "Maximum level" : `${formatNumber(nextLevelXp-game.xp)} XP to ${level+1}`}</b></div><i><span style={{width:`${xpProgress}%`}}/></i></div>
              <div className="xp-boost"><strong>5× XP active</strong><span>Each log grants 125 XP</span></div>
            </div> : <div className="equipment-panel">
              <div className="panel-heading"><div><span>Equipment</span><small>1 item equipped</small></div><b>1</b></div>
              <div className="equipment-layout">
                <span className="equipment-person" aria-hidden="true"><i/><b/><em/></span>
                <span className="gear-slot gear-slot--head" title="Head slot"/>
                <span className="gear-slot gear-slot--body" title="Body slot"/>
                <span className="gear-slot gear-slot--legs" title="Leg slot"/>
                <span className="gear-slot gear-slot--shield" title="Shield slot"/>
                <span className="gear-slot gear-slot--weapon gear-slot--filled" title="Weapon: Bronze axe"><AxeIcon/><small>Weapon</small></span>
              </div>
              <div className="equipped-item"><AxeIcon small/><div><strong>Bronze axe</strong><small>Equipped · 1 chop power</small></div></div>
            </div>}
            <div className="afk-row"><div><strong>AFK mode</strong><small>Gather, bank &amp; earn offline</small></div>
              <button className={`toggle ${game.afk ? "toggle--on" : ""}`} type="button" role="switch" aria-checked={game.afk} aria-label="Toggle AFK mode" onClick={toggleAfk}><span/></button>
            </div>
          </div>
        </aside>

        {offline && <div className="offline-overlay" role="dialog" aria-modal="true" aria-labelledby="offline-title">
          <div className="offline-card"><span className="offline-moon">☾</span><small>WELCOME BACK</small><h2 id="offline-title">The forest kept working</h2>
            <p>You were away for {formatDuration(offline.elapsed)}. AFK mode gathered and banked everything for you.</p>
            <div className="offline-rewards"><div><LogIcon/><span><small>LOGS BANKED</small><strong>+{formatNumber(offline.logs)}</strong></span></div><div><span className="reward-star">✦</span><span><small>WOODCUTTING XP</small><strong>+{formatNumber(offline.xp)}</strong></span></div></div>
            <button type="button" onClick={() => setOffline(null)}>Return to the forest</button>
          </div>
        </div>}
      </div>
    </section>
  </main>;
}
