"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";

const TREE_LAYOUT = [
  [8,13],[17,24],[29,12],[42,19],[55,11],[72,18],[86,11],[11,56],[24,69],
  [38,54],[52,67],[66,50],[80,64],[91,48],[6,84],[33,86],[62,87],[88,82],
] as const;
const BANK_POSITION = { x: 69, y: 39 };
const SAVE_KEY = "tallowmere-save-v1";
const CHOP_MS = 1700;
const RESPAWN_MS = 11_000;
const LOG_XP = 125;
const MAX_INVENTORY_SLOTS = 28;
const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000;

type Action = "idle" | "walking-point" | "walking-tree" | "chopping" | "walking-bank" | "banking" | "waiting";
type Panel = "inventory" | "skills" | "equipment";
type EquipmentSlot = "head" | "weapon" | "body" | "shield" | "legs";
type AxeId = "bronze-axe" | "iron-hatchet" | "steel-feller" | "ashen-splitter" | "silverleaf-axe" | "deepforge-axe" | "briar-edge" | "emberbite" | "frostcleaver" | "storm-hew" | "moonsteel-axe" | "sunforged-axe" | "runebark-cutter" | "obsidian-beak" | "dragonbone-axe" | "spiritwood-crescent" | "starfall-axe" | "voidglass-axe" | "elder-king-axe" | "tallowmere-relic";
type ArmorId = "leather-cap" | "traveler-tunic" | "wooden-buckler" | "worn-trousers";
type GearId = AxeId | ArmorId;
type ItemId = "logs" | GearId;
type BankItemId = ItemId;
type BankMenuMode = "withdraw" | "deposit";
type ItemCounts = Partial<Record<ItemId,number>>;
type InventorySlots = Array<ItemId|null>;
type GearItem = { id:GearId; name:string; slot:EquipmentSlot; description:string; kind:"axe"|"armor"; requiredLevel:number };
type AxeItem = GearItem & { id:AxeId; kind:"axe"; bonusChance:number; metal:string; edge:string; handle:string; shape:number };
type EquipmentState = Record<EquipmentSlot,GearId | null>;
type TreeState = { id: number; x: number; y: number; charges: number; maxCharges: number; respawnAt: number };
type GameState = {
  xp: number; inventorySlots:InventorySlots; bankItems:ItemCounts; afk: boolean; action: Action;
  targetTreeId: number | null; nextActionAt: number; characterX: number; characterY: number;
  trees: TreeState[]; now: number; equipment:EquipmentState;
};
type OfflineSummary = { elapsed: number; logs: number; xp: number };

const AXES:AxeItem[] = [
  {id:"bronze-axe",name:"Bronze Axe",slot:"weapon",kind:"axe",requiredLevel:1,bonusChance:0,description:"A dependable first axe",metal:"#a76b3f",edge:"#d19a62",handle:"#6e462a",shape:0},
  {id:"iron-hatchet",name:"Iron Hatchet",slot:"weapon",kind:"axe",requiredLevel:5,bonusChance:.05,description:"5% chance to cut an extra log",metal:"#70756f",edge:"#aeb2a8",handle:"#664329",shape:1},
  {id:"steel-feller",name:"Steel Feller",slot:"weapon",kind:"axe",requiredLevel:10,bonusChance:.10,description:"10% chance to cut an extra log",metal:"#6e7d82",edge:"#c6d0cc",handle:"#70472c",shape:2},
  {id:"ashen-splitter",name:"Ashen Splitter",slot:"weapon",kind:"axe",requiredLevel:15,bonusChance:.15,description:"15% chance to cut an extra log",metal:"#5e5b59",edge:"#aaa39b",handle:"#3f332a",shape:3},
  {id:"silverleaf-axe",name:"Silverleaf Axe",slot:"weapon",kind:"axe",requiredLevel:20,bonusChance:.20,description:"20% chance to cut an extra log",metal:"#81948b",edge:"#d4e3d9",handle:"#71523b",shape:4},
  {id:"deepforge-axe",name:"Deepforge Axe",slot:"weapon",kind:"axe",requiredLevel:25,bonusChance:.25,description:"25% chance to cut an extra log",metal:"#4f5960",edge:"#a7b4b9",handle:"#45352b",shape:0},
  {id:"briar-edge",name:"Briar Edge",slot:"weapon",kind:"axe",requiredLevel:30,bonusChance:.30,description:"30% chance to cut an extra log",metal:"#496447",edge:"#8da66f",handle:"#58402c",shape:1},
  {id:"emberbite",name:"Emberbite",slot:"weapon",kind:"axe",requiredLevel:35,bonusChance:.35,description:"35% chance to cut an extra log",metal:"#8a3f2c",edge:"#e28445",handle:"#522f25",shape:2},
  {id:"frostcleaver",name:"Frostcleaver",slot:"weapon",kind:"axe",requiredLevel:40,bonusChance:.40,description:"40% chance to cut an extra log",metal:"#65919c",edge:"#c0e4e5",handle:"#4d4b46",shape:3},
  {id:"storm-hew",name:"Storm Hew",slot:"weapon",kind:"axe",requiredLevel:45,bonusChance:.45,description:"45% chance to cut an extra log",metal:"#4e5d79",edge:"#9eafd0",handle:"#4c392c",shape:4},
  {id:"moonsteel-axe",name:"Moonsteel Axe",slot:"weapon",kind:"axe",requiredLevel:50,bonusChance:.50,description:"50% chance to cut an extra log",metal:"#77758c",edge:"#d1cfe8",handle:"#55496b",shape:0},
  {id:"sunforged-axe",name:"Sunforged Axe",slot:"weapon",kind:"axe",requiredLevel:55,bonusChance:.55,description:"55% chance to cut an extra log",metal:"#a96d2b",edge:"#f0c05e",handle:"#6b3e27",shape:1},
  {id:"runebark-cutter",name:"Runebark Cutter",slot:"weapon",kind:"axe",requiredLevel:60,bonusChance:.60,description:"60% chance to cut an extra log",metal:"#426c61",edge:"#70baa3",handle:"#3e5339",shape:2},
  {id:"obsidian-beak",name:"Obsidian Beak",slot:"weapon",kind:"axe",requiredLevel:65,bonusChance:.65,description:"65% chance to cut an extra log",metal:"#292a34",edge:"#796c8f",handle:"#3d2d35",shape:3},
  {id:"dragonbone-axe",name:"Dragonbone Axe",slot:"weapon",kind:"axe",requiredLevel:70,bonusChance:.70,description:"70% chance to cut an extra log",metal:"#89634d",edge:"#d9c49d",handle:"#5a3029",shape:4},
  {id:"spiritwood-crescent",name:"Spiritwood Crescent",slot:"weapon",kind:"axe",requiredLevel:75,bonusChance:.75,description:"75% chance to cut an extra log",metal:"#3e746a",edge:"#8bd4bd",handle:"#4d6545",shape:0},
  {id:"starfall-axe",name:"Starfall Axe",slot:"weapon",kind:"axe",requiredLevel:80,bonusChance:.80,description:"80% chance to cut an extra log",metal:"#536b8a",edge:"#b8d1e8",handle:"#463c5d",shape:1},
  {id:"voidglass-axe",name:"Voidglass Axe",slot:"weapon",kind:"axe",requiredLevel:85,bonusChance:.85,description:"85% chance to cut an extra log",metal:"#352b4c",edge:"#a174c4",handle:"#292233",shape:2},
  {id:"elder-king-axe",name:"Elder King's Axe",slot:"weapon",kind:"axe",requiredLevel:90,bonusChance:.90,description:"90% chance to cut an extra log",metal:"#77602c",edge:"#e1c55d",handle:"#4c3124",shape:3},
  {id:"tallowmere-relic",name:"Tallowmere Relic",slot:"weapon",kind:"axe",requiredLevel:99,bonusChance:.98,description:"98% chance to cut an extra log",metal:"#6b4934",edge:"#f0d883",handle:"#30271f",shape:4},
];

const ARMOR:GearItem[] = [
  {id:"leather-cap",name:"Leather cap",slot:"head",kind:"armor",requiredLevel:1,description:"A simple woodland cap"},
  {id:"traveler-tunic",name:"Traveler tunic",slot:"body",kind:"armor",requiredLevel:1,description:"Worn road clothing"},
  {id:"wooden-buckler",name:"Wooden buckler",slot:"shield",kind:"armor",requiredLevel:1,description:"A light wooden shield"},
  {id:"worn-trousers",name:"Worn trousers",slot:"legs",kind:"armor",requiredLevel:1,description:"Sturdy travel clothes"},
];

const GEAR = Object.fromEntries([...AXES,...ARMOR].map(item => [item.id,item])) as Record<GearId,GearItem>;
const AXE_BY_ID = Object.fromEntries(AXES.map(item => [item.id,item])) as Record<AxeId,AxeItem>;
const ITEMS = {
  logs:{id:"logs",name:"Logs",kind:"resource",description:"Freshly cut wood",requiredLevel:1},
  ...GEAR,
} as Record<ItemId,{id:ItemId;name:string;kind:"resource"|"axe"|"armor";description:string;requiredLevel:number}>;

const STARTING_EQUIPMENT:EquipmentState = {
  head:"leather-cap", weapon:"bronze-axe", body:"traveler-tunic", shield:"wooden-buckler", legs:"worn-trousers",
};

function makeTrees(): TreeState[] {
  return TREE_LAYOUT.map(([x,y], id) => {
    const maxCharges = 5 + ((id * 7 + 2) % 6);
    return { id, x, y, charges: maxCharges, maxCharges, respawnAt: 0 };
  });
}

function initialGame(): GameState {
  const bankItems:ItemCounts = {logs:0};
  AXES.filter(axe => axe.id !== "bronze-axe").forEach(axe => { bankItems[axe.id]=1; });
  return { xp:0, inventorySlots:Array<ItemId|null>(MAX_INVENTORY_SLOTS).fill(null), bankItems, afk:true, action:"idle", targetTreeId:null,
    nextActionAt:0, characterX:55, characterY:45, trees:makeTrees(), now:Date.now(),
    equipment:{...STARTING_EQUIPMENT} };
}

function itemCount(items:ItemCounts,id:ItemId) { return Math.max(0,Math.floor(items[id] ?? 0)); }
function setItemCount(items:ItemCounts,id:ItemId,count:number):ItemCounts {
  const next = {...items};
  if (count > 0) next[id]=Math.floor(count); else delete next[id];
  return next;
}
function normalizeItemCounts(value:unknown,fallback:ItemCounts={}):ItemCounts {
  if (!value || typeof value !== "object") return {...fallback};
  return Object.entries(value).reduce<ItemCounts>((counts,[id,count]) => {
    if (id in ITEMS && typeof count === "number" && count > 0) counts[id as ItemId]=Math.floor(count);
    return counts;
  },{});
}
function itemCountsToInventorySlots(items:ItemCounts):InventorySlots {
  const slots:InventorySlots = Array<ItemId|null>(MAX_INVENTORY_SLOTS).fill(null);
  let index = 0;
  (Object.keys(ITEMS) as ItemId[]).forEach(id => {
    for (let count=0;count<itemCount(items,id) && index<MAX_INVENTORY_SLOTS;count+=1) slots[index++]=id;
  });
  return slots;
}
function normalizeInventorySlots(value:unknown,fallback:ItemCounts={}):InventorySlots {
  if (!Array.isArray(value)) return itemCountsToInventorySlots(fallback);
  return Array.from({length:MAX_INVENTORY_SLOTS},(_,index) => {
    const id = value[index];
    return typeof id === "string" && id in ITEMS ? id as ItemId : null;
  });
}
function inventorySlotsUsed(state:Pick<GameState,"inventorySlots">) {
  return state.inventorySlots.reduce((total,item) => total + (item ? 1 : 0),0);
}
function inventoryItemCount(slots:InventorySlots,id:ItemId) {
  return slots.reduce((total,item) => total + (item===id ? 1 : 0),0);
}
function addInventoryItems(slots:InventorySlots,id:ItemId,amount:number):InventorySlots {
  const next = slots.slice();
  let remaining = Math.max(0,Math.floor(amount));
  for (let index=0;index<next.length && remaining>0;index+=1) {
    if (!next[index]) { next[index]=id; remaining-=1; }
  }
  return next;
}
function removeInventoryItems(slots:InventorySlots,id:ItemId,amount:number,preferredIndex?:number):InventorySlots {
  const next = slots.slice();
  let remaining = Math.max(0,Math.floor(amount));
  if (remaining>0 && preferredIndex !== undefined && preferredIndex>=0 && preferredIndex<next.length && next[preferredIndex]===id) {
    next[preferredIndex]=null; remaining-=1;
  }
  for (let index=0;index<next.length && remaining>0;index+=1) {
    if (next[index]===id) { next[index]=null; remaining-=1; }
  }
  return next;
}

function hasWoodcuttingAxe(state:Pick<GameState,"equipment">) {
  const weapon = state.equipment.weapon;
  return Boolean(weapon && GEAR[weapon]?.kind === "axe");
}

function equippedAxe(state:Pick<GameState,"equipment">) {
  const weapon = state.equipment.weapon;
  return weapon && GEAR[weapon]?.kind === "axe" ? AXE_BY_ID[weapon as AxeId] : null;
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
      style={{ left:`${tree.x}%`, top:`${tree.y}%` }} onClick={event => { event.stopPropagation(); onChoose(); }} disabled={depleted}
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

function AxeIcon({ id="bronze-axe", small=false }:{id?:AxeId;small?:boolean}) {
  const axe = AXE_BY_ID[id];
  const colors = {"--axe-metal":axe.metal,"--axe-edge":axe.edge,"--axe-handle":axe.handle} as CSSProperties;
  return <span className={`axe-icon axe-icon--shape-${axe.shape} ${small ? "axe-icon--small" : ""}`} style={colors} aria-hidden="true"><i/><b/></span>;
}

function LogIcon({ small=false }:{small?:boolean}) {
  return <span className={`log-icon ${small ? "log-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
}

function GearIcon({ id, small=false }:{id:GearId;small?:boolean}) {
  if (GEAR[id].kind === "axe") return <AxeIcon id={id as AxeId} small={small}/>;
  return <span className={`gear-icon gear-icon--${id} ${small ? "gear-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
}

function ItemIcon({ id, small=false }:{id:ItemId;small?:boolean}) {
  if (id === "logs") return <LogIcon small={small}/>;
  if (ITEMS[id].kind === "resource") return <span className={`resource-icon resource-icon--${id} ${small ? "resource-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
  return <GearIcon id={id as GearId} small={small}/>;
}

function InventoryGrid({ slots, level, mode="equip", onActivate, onItemContext, onMove }:{
  slots:InventorySlots; level:number; mode?:"equip"|"deposit"; onActivate?:(id:ItemId,index:number)=>void;
  onItemContext?:(event:ReactMouseEvent<HTMLButtonElement>,id:ItemId,index:number)=>void; onMove:(from:number,to:number)=>void;
}) {
  const [draggedSlot,setDraggedSlot] = useState<number|null>(null);
  const lastDragEndedAt = useRef(0);
  const used = slots.reduce((total,item) => total+(item ? 1 : 0),0);
  const dropItem = (event:ReactDragEvent<HTMLButtonElement>,to:number) => {
    event.preventDefault();
    const rawFrom = event.dataTransfer.getData("application/x-tallowmere-slot");
    const fromData = rawFrom === "" ? null : Number(rawFrom);
    const from = fromData !== null && Number.isInteger(fromData) ? fromData : draggedSlot;
    if (from !== null && from >= 0 && from < MAX_INVENTORY_SLOTS && from !== to) onMove(from,to);
    setDraggedSlot(null);
  };
  const moveWithKeyboard = (event:ReactKeyboardEvent<HTMLButtonElement>,from:number) => {
    if (!event.altKey) return;
    const offsets:Record<string,number> = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    const offset = offsets[event.key];
    if (!offset) return;
    const to = from+offset;
    if (to<0 || to>=MAX_INVENTORY_SLOTS) return;
    event.preventDefault(); onMove(from,to);
  };
  const activateItem = (id:ItemId,index:number) => {
    if (Date.now()-lastDragEndedAt.current < 180) return;
    onActivate?.(id,index);
  };
  return <div className="inventory-grid" aria-label={`Inventory, ${used} of 28 slots used`}>
    {Array.from({length:28}).map((_,index) => {
      const itemId = slots[index];
      if (itemId && ITEMS[itemId].kind !== "resource") {
        const gearId = itemId as GearId;
        const locked = mode==="equip" && GEAR[gearId].requiredLevel > level;
        const title = mode==="deposit" ? `Deposit ${GEAR[gearId].name}` : locked ? `${GEAR[gearId].name} requires Woodcutting ${GEAR[gearId].requiredLevel}` : `Equip ${GEAR[gearId].name}`;
        return <button className={`inventory-slot inventory-slot--filled inventory-slot--gear inventory-slot--draggable ${locked ? "inventory-slot--locked" : ""} ${draggedSlot===index ? "inventory-slot--dragging" : ""}`} type="button" key={index}
          draggable onDragStart={event => {event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("application/x-tallowmere-slot",String(index));setDraggedSlot(index);}}
          onDragEnd={() => {lastDragEndedAt.current=Date.now();setDraggedSlot(null);}} onDragOver={event => event.preventDefault()} onDrop={event => dropItem(event,index)} onKeyDown={event => moveWithKeyboard(event,index)}
          onClick={() => activateItem(itemId,index)} onContextMenu={event => onItemContext?.(event,itemId,index)} title={`${title}. Drag to rearrange.`} aria-label={`${title}. Drag to rearrange.`}>
          <GearIcon id={gearId}/><span className="inventory-equip-mark">{mode==="deposit" ? "↓" : locked ? GEAR[gearId].requiredLevel : "+"}</span>
        </button>;
      }
      if (itemId) {
        const title = mode==="deposit" ? `Deposit ${ITEMS[itemId].name}` : ITEMS[itemId].name;
        return <button className={`inventory-slot inventory-slot--filled inventory-slot--draggable ${mode==="deposit" ? "inventory-slot--actionable" : ""} ${draggedSlot===index ? "inventory-slot--dragging" : ""}`} type="button" key={index}
          draggable onDragStart={event => {event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("application/x-tallowmere-slot",String(index));setDraggedSlot(index);}}
          onDragEnd={() => {lastDragEndedAt.current=Date.now();setDraggedSlot(null);}} onDragOver={event => event.preventDefault()} onDrop={event => dropItem(event,index)} onKeyDown={event => moveWithKeyboard(event,index)}
          onClick={() => mode==="deposit" && activateItem(itemId,index)} onContextMenu={event => onItemContext?.(event,itemId,index)} title={`${title}. Drag to rearrange.`} aria-label={`${title}. Drag to rearrange.`}>
          <ItemIcon id={itemId}/><span className="item-amount">1</span>
        </button>;
      }
      return <button className="inventory-slot inventory-slot--drop-target" type="button" key={index} aria-label={`Empty inventory slot ${index+1}`}
        onDragOver={event => {event.preventDefault();event.dataTransfer.dropEffect="move";}} onDrop={event => dropItem(event,index)}/>;
    })}
  </div>;
}

function GearSlot({ slot, itemId, onUnequip }:{slot:EquipmentSlot;itemId:GearId|null;onUnequip:(slot:EquipmentSlot)=>void}) {
  const item = itemId ? GEAR[itemId] : null;
  return <button className={`gear-slot gear-slot--${slot} ${item ? "gear-slot--filled" : ""}`} type="button"
    onClick={() => item && onUnequip(slot)} disabled={!item} title={item ? `Unequip ${item.name}` : `Empty ${slot} slot`}
    aria-label={item ? `Unequip ${item.name} from ${slot} slot` : `Empty ${slot} slot`}>
    {item && <GearIcon id={item.id}/>}<small>{slot}</small>
  </button>;
}

export default function Home() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [hydrated, setHydrated] = useState(false);
  const [panel, setPanel] = useState<Panel>("inventory");
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [welcome, setWelcome] = useState(true);
  const [bankOpen, setBankOpen] = useState(false);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const [moveMarker, setMoveMarker] = useState<{x:number;y:number} | null>(null);
  const [gearNotice, setGearNotice] = useState("Click a filled slot to unequip it.");
  const [selectedBankItem, setSelectedBankItem] = useState<ItemId>("iron-hatchet");
  const [bankCompanionPanel, setBankCompanionPanel] = useState<"inventory"|"equipment">("inventory");
  const [bankMenu, setBankMenu] = useState<{item:BankItemId;mode:BankMenuMode;slotIndex?:number;x:number;y:number;custom:boolean} | null>(null);
  const [customWithdrawAmount, setCustomWithdrawAmount] = useState("1");
  const latestGame = useRef(game);

  useEffect(() => { latestGame.current = game; }, [game]);

  useEffect(() => {
    const now = Date.now();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GameState> & { lastSeen?:number;inventoryItems?:ItemCounts;inventoryLogs?:number;bankLogs?:number;inventoryGear?:GearId[];bankGear?:AxeId[] };
        const base = initialGame();
        const savedTrees = Array.isArray(saved.trees) && saved.trees.length === TREE_LAYOUT.length ? saved.trees : base.trees;
        const equipment:EquipmentState = saved.equipment ? { ...base.equipment,...saved.equipment } : base.equipment;
        let legacyInventoryItems = normalizeItemCounts(saved.inventoryItems);
        if (!saved.inventoryItems) {
          legacyInventoryItems = setItemCount(legacyInventoryItems,"logs",saved.inventoryLogs ?? 0);
          (saved.inventoryGear ?? []).filter(id => id in GEAR).forEach(id => { legacyInventoryItems=setItemCount(legacyInventoryItems,id,itemCount(legacyInventoryItems,id)+1); });
        }
        const inventorySlots = normalizeInventorySlots(saved.inventorySlots,legacyInventoryItems);
        let bankItems = normalizeItemCounts(saved.bankItems,base.bankItems);
        if (!saved.bankItems) {
          bankItems = setItemCount({},"logs",saved.bankLogs ?? 0);
          const legacyBankGear = saved.bankGear ?? AXES.filter(axe => axe.id!=="bronze-axe").map(axe => axe.id);
          legacyBankGear.filter(id => id in AXE_BY_ID).forEach(id => { bankItems=setItemCount(bankItems,id,itemCount(bankItems,id)+1); });
        }
        const elapsed = Math.min(MAX_OFFLINE_MS, Math.max(0, now - (saved.lastSeen ?? now)));
        const offlineAxe = equipment.weapon && GEAR[equipment.weapon]?.kind === "axe" ? AXE_BY_ID[equipment.weapon as AxeId] : null;
        const offlineActions = saved.afk && offlineAxe && elapsed > 10_000 ? Math.floor(elapsed / 2400) : 0;
        const offlineLogs = offlineAxe ? Math.floor(offlineActions * (1 + offlineAxe.bonusChance)) : 0;
        const offlineXp = offlineLogs * LOG_XP;
        bankItems=setItemCount(bankItems,"logs",itemCount(bankItems,"logs")+offlineLogs);
        setGame({ ...base, xp:Math.min(MAX_XP,(saved.xp ?? 0) + offlineXp),inventorySlots,bankItems,equipment,afk:saved.afk ?? true,
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({ xp:current.xp, inventorySlots:current.inventorySlots,bankItems:current.bankItems,
        afk:current.afk, characterX:current.characterX, characterY:current.characterY,
        trees:current.trees, equipment:current.equipment,lastSeen:Date.now() }));
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
        if (!state.afk || !hasWoodcuttingAxe(state)) return state;
        if (inventorySlotsUsed(state) >= MAX_INVENTORY_SLOTS) return inventoryItemCount(state.inventorySlots,"logs") > 0 ? moveToBank(state,now) : { ...state, afk:false };
        return moveToNextTree(state,now);
      }
      if (state.action === "walking-point") return { ...state, action:"idle", nextActionAt:0 };
      if (state.action === "waiting") return state.afk && hasWoodcuttingAxe(state) ? moveToNextTree(state,now) : { ...state, action:"idle", afk:false };
      if (state.action === "walking-tree") {
        if (!hasWoodcuttingAxe(state)) return { ...state, action:"idle", afk:false, targetTreeId:null };
        const tree = state.trees.find(item => item.id === state.targetTreeId);
        return tree && tree.charges > 0 ? { ...state, action:"chopping", nextActionAt:now + CHOP_MS }
          : state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
      }
      if (state.action === "chopping") {
        if (!hasWoodcuttingAxe(state)) return { ...state, action:"idle", afk:false, targetTreeId:null };
        if (inventorySlotsUsed(state) >= MAX_INVENTORY_SLOTS) return state.afk && inventoryItemCount(state.inventorySlots,"logs") > 0 ? moveToBank(state,now) : { ...state, action:"idle", targetTreeId:null };
        const index = state.trees.findIndex(item => item.id === state.targetTreeId);
        const tree = state.trees[index];
        if (!tree || tree.charges <= 0) return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
        const axe = equippedAxe(state);
        const freeSlots = MAX_INVENTORY_SLOTS - inventorySlotsUsed(state);
        const bonusLog = axe && Math.random() < axe.bonusChance ? 1 : 0;
        const logsGained = Math.min(tree.charges,freeSlots,1 + bonusLog);
        const remaining = tree.charges - logsGained;
        const trees = state.trees.slice();
        trees[index] = { ...tree, charges:remaining, respawnAt:remaining === 0 ? now + RESPAWN_MS : 0 };
        state = { ...state, trees, inventorySlots:addInventoryItems(state.inventorySlots,"logs",logsGained), xp:Math.min(MAX_XP,state.xp + LOG_XP * logsGained) };
        if (inventorySlotsUsed(state) >= MAX_INVENTORY_SLOTS) return state.afk ? moveToBank(state,now) : { ...state, action:"idle", targetTreeId:null };
        if (remaining === 0) return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
        return { ...state, nextActionAt:now + CHOP_MS };
      }
      if (state.action === "walking-bank") return { ...state, action:"banking", nextActionAt:now + 650 };
      if (state.action === "banking") {
        const logs = inventoryItemCount(state.inventorySlots,"logs");
        state = { ...state, bankItems:setItemCount(state.bankItems,"logs",itemCount(state.bankItems,"logs")+logs), inventorySlots:removeInventoryItems(state.inventorySlots,"logs",logs) };
        return state.afk && hasWoodcuttingAxe(state) ? moveToNextTree(state,now) : { ...state, action:"idle", nextActionAt:0 };
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
  const inventoryUsed = inventorySlotsUsed(game);
  const inventoryLogs = inventoryItemCount(game.inventorySlots,"logs");
  const bankLogs = itemCount(game.bankItems,"logs");
  const firstInventoryItem = game.inventorySlots.find((item):item is ItemId => Boolean(item)) ?? null;
  const equippedCount = Object.values(game.equipment).filter(Boolean).length;
  const currentAxe = equippedAxe(game);
  const selectedItem = ITEMS[selectedBankItem];
  const selectedItemEquipped = selectedBankItem !== "logs" && Object.values(game.equipment).includes(selectedBankItem as GearId);
  const selectedItemInPack = inventoryItemCount(game.inventorySlots,selectedBankItem)>0;
  const selectedItemInBank = itemCount(game.bankItems,selectedBankItem)>0;
  const bankCatalog = (Object.keys(ITEMS) as ItemId[]).filter(id => itemCount(game.bankItems,id)>0);
  const actionText = useMemo(() => {
    if (game.action === "walking-point") return "Walking across the wood";
    if (game.action === "walking-tree") return "Walking to a tree";
    if (game.action === "chopping") return "Chopping logs";
    if (game.action === "walking-bank") return "Walking to the bank";
    if (game.action === "banking") return "Depositing logs";
    if (game.action === "waiting") return "Waiting for a tree";
    if (!hasWoodcuttingAxe(game)) return "Equip an axe to chop";
    if (inventoryUsed >= MAX_INVENTORY_SLOTS) return "Inventory full";
    return game.afk ? "Finding a tree" : "Ready to explore";
  },[game,inventoryUsed]);

  const chooseTree = (tree:TreeState) => {
    if (!hasWoodcuttingAxe(game)) { setPanel("equipment"); return; }
    if (tree.charges <= 0 || inventoryUsed >= MAX_INVENTORY_SLOTS) return;
    setWelcome(false); setBankOpen(false);
    setGame(previous => moveToTree({ ...previous, now:Date.now() }, tree, Date.now()));
  };

  const toggleAfk = () => {
    if (!game.afk && !hasWoodcuttingAxe(game)) { setPanel("equipment"); return; }
    setGame(previous => {
    const now = Date.now();
    if (previous.afk) return { ...previous, afk:false, action:"idle", targetTreeId:null, nextActionAt:0, now };
    const enabled = { ...previous, afk:true, now };
    return inventorySlotsUsed(enabled) >= MAX_INVENTORY_SLOTS ? moveToBank(enabled,now) : moveToNextTree(enabled,now);
  });
  };

  const visitBank = () => {
    setWelcome(false); setBankOpen(true);
    const now = Date.now();
    setGame(previous => ({...previous,afk:false,action:"walking-point",targetTreeId:null,characterX:BANK_POSITION.x,
      characterY:BANK_POSITION.y,nextActionAt:now+walkTime(previous.characterX,previous.characterY,BANK_POSITION.x,BANK_POSITION.y),now}));
  };

  const depositInventoryItem = (item:ItemId,requested:number,preferredSlot?:number) => {
    const available = inventoryItemCount(game.inventorySlots,item);
    const amount = Math.min(Math.max(0,Math.floor(requested)),available);
    if (amount <= 0) { setGearNotice(`No ${ITEMS[item].name.toLowerCase()} to deposit.`); return; }
    setGame(previous => {
      const safeAmount = Math.min(amount,inventoryItemCount(previous.inventorySlots,item));
      if (safeAmount <= 0) return previous;
      return {...previous,bankItems:setItemCount(previous.bankItems,item,itemCount(previous.bankItems,item)+safeAmount),
        inventorySlots:removeInventoryItems(previous.inventorySlots,item,safeAmount,preferredSlot),now:Date.now()};
    });
    setGearNotice(`${amount} ${amount===1 ? ITEMS[item].name : ITEMS[item].name.toLowerCase()} deposited.`);
  };

  const depositEntireInventory = () => {
    if (inventoryUsed <= 0) { setGearNotice("Your inventory is already empty."); return; }
    setGame(previous => {
      const bankItems = (Object.keys(ITEMS) as ItemId[]).reduce<ItemCounts>((items,id) => {
        const amount = inventoryItemCount(previous.inventorySlots,id);
        return amount > 0 ? setItemCount(items,id,itemCount(items,id)+amount) : items;
      },previous.bankItems);
      return {...previous,bankItems,inventorySlots:Array<ItemId|null>(MAX_INVENTORY_SLOTS).fill(null),now:Date.now()};
    });
    setGearNotice(`${inventoryUsed} inventory ${inventoryUsed===1 ? "item" : "items"} deposited.`);
    setBankMenu(null);
  };

  const begin = () => {
    setWelcome(false);
    setGame(previous => {
      if (!hasWoodcuttingAxe(previous)) return { ...previous, afk:false };
      const tree = availableTree(previous); return tree ? moveToTree(previous,tree,Date.now()) : previous;
    });
  };

  const equipGear = (id:GearId) => {
    const item = GEAR[id];
    if (item.requiredLevel > level) { setGearNotice(`${item.name} requires Woodcutting level ${item.requiredLevel}.`); setPanel("equipment"); return; }
    setGame(previous => {
      const inventoryIndex = previous.inventorySlots.indexOf(id);
      if (inventoryIndex < 0) return previous;
      let inventorySlots = previous.inventorySlots.slice();
      inventorySlots[inventoryIndex]=null;
      const replaced = previous.equipment[item.slot];
      if (replaced) inventorySlots=addInventoryItems(inventorySlots,replaced,1);
      return { ...previous, equipment:{...previous.equipment,[item.slot]:id}, inventorySlots, now:Date.now() };
    });
    setGearNotice(`${item.name} equipped.`);
    setPanel("equipment");
  };

  const unequipGear = (slot:EquipmentSlot) => {
    const item = game.equipment[slot] ? GEAR[game.equipment[slot]!] : null;
    if (inventoryUsed >= MAX_INVENTORY_SLOTS) { setGearNotice("Your inventory is full."); return; }
    setGame(previous => {
      const id = previous.equipment[slot];
      if (!id || inventorySlotsUsed(previous) >= MAX_INVENTORY_SLOTS) return previous;
      const removingAxe = slot === "weapon";
      return { ...previous, equipment:{...previous.equipment,[slot]:null}, inventorySlots:addInventoryItems(previous.inventorySlots,id,1),
        afk:removingAxe ? false : previous.afk, action:removingAxe ? "idle" : previous.action,
        targetTreeId:removingAxe ? null : previous.targetTreeId, nextActionAt:removingAxe ? 0 : previous.nextActionAt, now:Date.now() };
    });
    if (item) setGearNotice(`${item.name} moved to your inventory.`);
  };

  const withdrawBankItem = (item:BankItemId,requested:number) => {
    const freeSlots = MAX_INVENTORY_SLOTS-inventoryUsed;
    const available = itemCount(game.bankItems,item);
    const amount = Math.min(Math.max(0,Math.floor(requested)),freeSlots,available);
    if (amount <= 0) {
      setGearNotice(freeSlots <= 0 ? "Your inventory is full." : "That item is not currently in the bank.");
      setBankMenu(null); return;
    }
    setGame(previous => {
      const safeAmount = Math.min(amount,MAX_INVENTORY_SLOTS-inventorySlotsUsed(previous),itemCount(previous.bankItems,item));
      if (safeAmount <= 0) return previous;
      return {...previous,bankItems:setItemCount(previous.bankItems,item,itemCount(previous.bankItems,item)-safeAmount),
        inventorySlots:addInventoryItems(previous.inventorySlots,item,safeAmount),now:Date.now()};
    });
    setGearNotice(`${amount} ${amount===1 ? ITEMS[item].name : ITEMS[item].name.toLowerCase()} withdrawn.`);
    setBankMenu(null);
  };

  const openBankMenu = (event:ReactMouseEvent<HTMLElement>,item:BankItemId,mode:BankMenuMode,slotIndex?:number) => {
    event.preventDefault(); event.stopPropagation();
    const panelBounds = event.currentTarget.closest(".bank-panel")?.getBoundingClientRect();
    if (!panelBounds) return;
    setCustomWithdrawAmount("1");
    setBankMenu({item,mode,slotIndex,x:Math.max(6,Math.min(panelBounds.width-174,event.clientX-panelBounds.left)),
      y:Math.max(36,Math.min(panelBounds.height-222,event.clientY-panelBounds.top)),custom:false});
  };

  const transferFromBankMenu = (requested:number) => {
    if (!bankMenu) return;
    if (bankMenu.mode === "withdraw") withdrawBankItem(bankMenu.item,requested);
    else { depositInventoryItem(bankMenu.item,requested,bankMenu.slotIndex); setBankMenu(null); }
  };

  const moveInventorySlot = (from:number,to:number) => setGame(previous => {
    if (from===to || from<0 || to<0 || from>=MAX_INVENTORY_SLOTS || to>=MAX_INVENTORY_SLOTS || !previous.inventorySlots[from]) return previous;
    const inventorySlots = previous.inventorySlots.slice();
    [inventorySlots[from],inventorySlots[to]]=[inventorySlots[to],inventorySlots[from]];
    return {...previous,inventorySlots,now:Date.now()};
  });

  const walkToPoint = (event:ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(2,Math.min(98,((event.clientX-bounds.left)/bounds.width)*100));
    const y = Math.max(2,Math.min(98,((event.clientY-bounds.top)/bounds.height)*100));
    const now = Date.now();
    setWelcome(false); setBankOpen(false); setMoveMarker({x,y});
    setGame(previous => ({ ...previous, afk:false, action:"walking-point", targetTreeId:null,
      characterX:x, characterY:y, nextActionAt:now + walkTime(previous.characterX,previous.characterY,x,y), now }));
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
        <div className="stat-pill"><span className="stat-icon stat-icon--log"/><div><small>Banked logs</small><strong>{formatNumber(bankLogs)}</strong></div></div>
        <div className="world-size"><span/>100 × 100 TILES</div>
      </div>
    </header>

    <section className="world-card" aria-label="Tallowmere forest game world">
      <div className="world-map">
        <div className="world-layer" style={{ transform:`translate(${cameraX}%, ${cameraY}%)` }} onClick={walkToPoint} aria-label="Tallowmere Wood. Click the ground to walk.">
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

          <button className="bank-building" type="button" aria-label="Enter Tallowmere bank" onClick={event => { event.stopPropagation(); visitBank(); }}>
            <span className="bank-shadow"/><span className="bank-roof"><i/><b/></span><span className="bank-wall"/>
            <span className="bank-door"/><span className="bank-window bank-window--left"/><span className="bank-window bank-window--right"/><strong>BANK</strong>
          </button>

          <div className={`player-character player-character--${game.action} ${game.equipment.head ? "player-character--head-equipped" : "player-character--bare-head"} ${game.equipment.body ? "player-character--body-equipped" : "player-character--no-body"} ${game.equipment.shield ? "player-character--shield-equipped" : ""} ${game.equipment.legs ? "player-character--legs-equipped" : "player-character--no-legs"}`} style={{left:`${game.characterX}%`,top:`${game.characterY}%`,"--axe-metal":currentAxe?.metal ?? "#a76b3f","--axe-edge":currentAxe?.edge ?? "#d19a62","--axe-handle":currentAxe?.handle ?? "#6e462a"} as CSSProperties} aria-label={`Your character is ${actionText.toLowerCase()}`}>
            <span className="character-shadow"/><span className="character-hair"/><span className="character-head"/><span className="character-body"/>
            <span className="character-cloak"/><span className="character-shield"/><span className="character-belt"/><span className="character-arm"/><span className="character-legs"/><span className="character-axe"><i/><b/></span>
          </div>
          {moveMarker && game.action === "walking-point" && <span className="movement-marker" style={{left:`${moveMarker.x}%`,top:`${moveMarker.y}%`}} aria-hidden="true"><i/></span>}
        </div>

        <div className="region-plaque" aria-hidden="true"><small>WESTERN MARCH</small><strong>Tallowmere Wood</strong></div>
        <div className="movement-hint" aria-hidden="true"><span>✥</span> Click the ground to move</div>

        {welcome && <aside className="welcome-card">
          <button className="welcome-close" type="button" aria-label="Close welcome card" onClick={() => setWelcome(false)}>×</button>
          <span className="eyebrow">THE OLD ROAD AWAITS</span><h2>Enter Tallowmere Wood</h2>
          <p>Choose a tree and put your bronze axe to work. AFK mode will roam the wood, bank your logs, and keep watch while you are away.</p>
          <button className="welcome-action" type="button" onClick={begin}>Enter the wood <span>›</span></button>
        </aside>}

        {bankOpen && <aside className="bank-panel bank-panel--vault" aria-label="Tallowmere bank interior">
          <div className="bank-classic-title"><span>{formatNumber(bankLogs)}</span><strong>The Bank of Tallowmere</strong><button type="button" onClick={() => {setBankOpen(false);setBankMenu(null);}} aria-label="Close bank">×</button></div>
          <div className="bank-workspace">
            <div className="bank-vault-main">
              <div className="bank-classic-grid" aria-label="Stored items">
                {bankCatalog.map(id => {
                  const item = ITEMS[id];
                  const inBank = itemCount(game.bankItems,id);
                  const locked = level < item.requiredLevel;
                  return <button className={`bank-item ${id==="logs" ? "bank-item--logs" : "bank-item--item"} ${locked ? "bank-item--locked" : ""} ${selectedBankItem===id ? "bank-item--selected" : ""}`} type="button" key={id}
                    onClick={() => {setSelectedBankItem(id);withdrawBankItem(id,1);}} onContextMenu={event => {setSelectedBankItem(id);openBankMenu(event,id,"withdraw");}}
                    title={`${item.name} — left-click withdraws 1, right-click for more options`}>
                    <ItemIcon id={id}/><span>{id==="logs" ? formatNumber(inBank) : `Lv ${item.requiredLevel}`}</span><small>{formatNumber(inBank)}</small>
                  </button>;
                })}
              </div>
              <div className="bank-selected-item"><ItemIcon id={selectedItem.id}/><div><small>SELECTED ITEM</small><strong>{selectedItem.name}</strong><span>{selectedItem.kind==="axe" ? `Woodcutting ${selectedItem.requiredLevel} · ${Math.round(AXE_BY_ID[selectedItem.id as AxeId].bonusChance*100)}% extra-log chance` : selectedItem.description}</span></div>
                {selectedItemEquipped ? <button type="button" disabled>Equipped</button> : selectedItemInBank ? <button type="button" onClick={() => withdrawBankItem(selectedBankItem,1)}>Withdraw 1</button> : selectedItemInPack ? <button type="button" onClick={() => depositInventoryItem(selectedBankItem,1)}>Store 1</button> : <button type="button" disabled>Unavailable</button>}
              </div>
              <div className="bank-classic-controls"><button type="button" className="bank-deposit" disabled={inventoryUsed===0} onClick={depositEntireInventory}>{inventoryUsed>0 ? `Deposit inventory (${inventoryUsed})` : "Inventory empty"}</button><span>{gearNotice}</span><small>Bank: left withdraws · right opens options</small></div>
            </div>
            <div className="bank-companion" aria-label="Inventory and equipment">
              <div className="bank-companion-tabs">
                <button type="button" className={bankCompanionPanel==="inventory" ? "bank-companion-tab--active" : ""} onClick={() => setBankCompanionPanel("inventory")}><span className="tab-bag"><i/></span>Inventory</button>
                <button type="button" className={bankCompanionPanel==="equipment" ? "bank-companion-tab--active" : ""} onClick={() => setBankCompanionPanel("equipment")}><span className="tab-equipment"><i/><b/></span>Equipment</button>
              </div>
              {bankCompanionPanel === "inventory" ? <div className="bank-pack-panel">
                <div className="bank-pack-heading"><div><strong>Inventory</strong><small>{inventoryUsed} / 28 slots</small></div><b>{28-inventoryUsed}</b></div>
                <InventoryGrid slots={game.inventorySlots} level={level} mode="deposit" onMove={moveInventorySlot}
                  onActivate={(itemId,index) => {setSelectedBankItem(itemId);depositInventoryItem(itemId,1,index);}}
                  onItemContext={(event,itemId,index) => {setSelectedBankItem(itemId);openBankMenu(event,itemId,"deposit",index);}}/>
                <p>Drag items to rearrange. Click to deposit one, or right-click for quantity options.</p>
                <button type="button" className="bank-deposit-all" disabled={inventoryUsed===0} onClick={depositEntireInventory}>Deposit all inventory</button>
              </div> : <div className="bank-equipment-panel">
                <div className="bank-pack-heading"><div><strong>Equipment</strong><small>{equippedCount} items equipped</small></div><b>{equippedCount}</b></div>
                <div className="equipment-layout">
                  <span className="equipment-person" aria-hidden="true"><i/><b/><em/></span>
                  <GearSlot slot="head" itemId={game.equipment.head} onUnequip={unequipGear}/>
                  <GearSlot slot="body" itemId={game.equipment.body} onUnequip={unequipGear}/>
                  <GearSlot slot="legs" itemId={game.equipment.legs} onUnequip={unequipGear}/>
                  <GearSlot slot="shield" itemId={game.equipment.shield} onUnequip={unequipGear}/>
                  <GearSlot slot="weapon" itemId={game.equipment.weapon} onUnequip={unequipGear}/>
                </div>
                <p>Click equipped gear to move it into your inventory.</p>
              </div>}
            </div>
          </div>
          {bankMenu && <div className="bank-context-menu" style={{left:bankMenu.x,top:bankMenu.y}}>
            <strong>{ITEMS[bankMenu.item].name}</strong>
            {!bankMenu.custom ? <>
              <button type="button" onClick={() => transferFromBankMenu(1)}>{bankMenu.mode === "withdraw" ? "Withdraw" : "Deposit"} 1</button>
              <button type="button" onClick={() => transferFromBankMenu(5)}>{bankMenu.mode === "withdraw" ? "Withdraw" : "Deposit"} 5</button>
              <button type="button" onClick={() => transferFromBankMenu(10)}>{bankMenu.mode === "withdraw" ? "Withdraw" : "Deposit"} 10</button>
              <button type="button" onClick={() => transferFromBankMenu(bankMenu.mode === "withdraw" ? itemCount(game.bankItems,bankMenu.item) : inventoryItemCount(game.inventorySlots,bankMenu.item))}>{bankMenu.mode === "withdraw" ? "Withdraw" : "Deposit"} all</button>
              <button type="button" onClick={() => setBankMenu({...bankMenu,custom:true})}>Custom amount…</button>
              <button type="button" className="bank-menu-cancel" onClick={() => setBankMenu(null)}>Cancel</button>
            </> : <form onSubmit={event => {event.preventDefault();transferFromBankMenu(Number(customWithdrawAmount));}}>
              <label htmlFor="custom-withdraw">Amount</label><input id="custom-withdraw" type="number" min="1" max={bankMenu.mode === "withdraw" ? itemCount(game.bankItems,bankMenu.item) : inventoryItemCount(game.inventorySlots,bankMenu.item)} value={customWithdrawAmount} onChange={event => setCustomWithdrawAmount(event.target.value)}/>
              <div><button type="submit">{bankMenu.mode === "withdraw" ? "Withdraw" : "Deposit"}</button><button type="button" onClick={() => setBankMenu({...bankMenu,custom:false})}>Back</button></div>
            </form>}
          </div>}
        </aside>}

        <div className="status-dock" aria-live="polite">
          <span className="status-avatar"><i/></span><div className="status-copy"><small>Current action</small><strong>{actionText}</strong></div>
          <div className="status-divider"/><div className="xp-summary"><small>Woodcutting XP</small><strong>{formatNumber(game.xp)} <span>/ {level>=99 ? "MAX" : formatNumber(nextLevelXp)} XP</span></strong></div>
          <div className="xp-bar" title={game.action==="chopping" ? "Chop progress" : "Level progress"}><span style={{width:`${actionProgress}%`}}/></div>
        </div>

        <aside className={`side-panel ${panelMinimized ? "side-panel--minimized" : ""} ${bankOpen ? "side-panel--bank-open" : ""}`}>
          <div className="panel-tabs" aria-label="Game panels">
            <button className="panel-minimize" type="button" aria-label={panelMinimized ? "Open game panel" : "Minimize game panel"} aria-expanded={!panelMinimized} onClick={() => setPanelMinimized(value => !value)}>{panelMinimized ? "▴" : "—"}</button>
            <button className={`panel-tab ${panel==="skills" ? "panel-tab--active" : ""}`} type="button" aria-label="Woodcutting skill" aria-pressed={panel==="skills"} onClick={() => {setPanel("skills");setPanelMinimized(false);}}><span className="tab-axe"><i/><b/></span></button>
            <button className={`panel-tab ${panel==="equipment" ? "panel-tab--active" : ""}`} type="button" aria-label="Equipment" aria-pressed={panel==="equipment"} onClick={() => {setPanel("equipment");setPanelMinimized(false);}}><span className="tab-equipment"><i/><b/></span></button>
            <button className={`panel-tab ${panel==="inventory" ? "panel-tab--active" : ""}`} type="button" aria-label="Inventory" aria-pressed={panel==="inventory"} onClick={() => {setPanel("inventory");setPanelMinimized(false);}}><span className="tab-bag"><i/></span></button>
          </div>
          {!panelMinimized && <div className="inventory-panel">
            {panel === "inventory" ? <>
              <div className="panel-heading"><div><span>Inventory</span><small>{inventoryUsed} / 28 slots</small></div><b>{28-inventoryUsed}</b></div>
              <InventoryGrid slots={game.inventorySlots} level={level} onMove={moveInventorySlot}
                onActivate={itemId => ITEMS[itemId].kind!=="resource" && equipGear(itemId as GearId)}/>
              <p className="inventory-help">Drag items to rearrange your pack.</p>
              <div className="item-detail">{firstInventoryItem ? <><ItemIcon id={firstInventoryItem} small/><div><strong>{ITEMS[firstInventoryItem].name}</strong><small>{firstInventoryItem === "logs" ? `${inventoryLogs} ready to bank` : ITEMS[firstInventoryItem].description}</small></div></> : <><LogIcon small/><div><strong>Empty pack</strong><small>Your pack is ready</small></div></>}</div>
            </> : panel === "skills" ? <div className="skill-panel">
              <div className="panel-heading"><div><span>Skills</span><small>1 skill available</small></div><b>1</b></div>
              <div className="skill-card"><span className="skill-card__icon"><span className="tab-axe"><i/><b/></span></span><div className="skill-card__copy"><small>WOODCUTTING</small><strong>Level {level}</strong><span>{formatNumber(game.xp)} XP</span></div></div>
              <div className="skill-progress"><div><span>Level {level}</span><b>{level>=99 ? "Maximum level" : `${formatNumber(nextLevelXp-game.xp)} XP to ${level+1}`}</b></div><i><span style={{width:`${xpProgress}%`}}/></i></div>
              <div className="xp-boost"><strong>5× XP active</strong><span>Each log grants 125 XP</span></div>
            </div> : <div className="equipment-panel">
              <div className="panel-heading"><div><span>Equipment</span><small>{equippedCount} items equipped</small></div><b>{equippedCount}</b></div>
              <div className="equipment-layout">
                <span className="equipment-person" aria-hidden="true"><i/><b/><em/></span>
                <GearSlot slot="head" itemId={game.equipment.head} onUnequip={unequipGear}/>
                <GearSlot slot="body" itemId={game.equipment.body} onUnequip={unequipGear}/>
                <GearSlot slot="legs" itemId={game.equipment.legs} onUnequip={unequipGear}/>
                <GearSlot slot="shield" itemId={game.equipment.shield} onUnequip={unequipGear}/>
                <GearSlot slot="weapon" itemId={game.equipment.weapon} onUnequip={unequipGear}/>
              </div>
              <div className="equipped-item">{game.equipment.weapon ? <GearIcon id={game.equipment.weapon} small/> : <span className="empty-gear-mark">×</span>}<div><strong>{currentAxe ? currentAxe.name : "No weapon equipped"}</strong><small>{currentAxe ? `Level ${currentAxe.requiredLevel} · ${Math.round(currentAxe.bonusChance*100)}% extra-log chance` : "Equip an axe from your inventory or bank"}</small></div></div>
              <p className="equipment-notice">{gearNotice}</p>
            </div>}
            <div className="afk-row"><div><strong>AFK mode</strong><small>Gather, bank &amp; earn offline</small></div>
              <button className={`toggle ${game.afk ? "toggle--on" : ""}`} type="button" role="switch" aria-checked={game.afk} aria-label="Toggle AFK mode" onClick={toggleAfk}><span/></button>
            </div>
          </div>}
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
