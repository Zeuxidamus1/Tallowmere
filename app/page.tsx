"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { GearSlot } from "./game/components/GearSlot";
import { InventoryGrid } from "./game/components/InventoryGrid";
import { GearIcon, ItemIcon, LogIcon } from "./game/components/ItemIcons";
import { PixelTree } from "./game/components/PixelTree";
import { CityBuilding } from "./game/components/CityBuilding";
import { StorePanel } from "./game/components/StorePanel";
import { GoldStackIcon } from "./game/components/GoldStackIcon";
import { addGold, formatGold, normalizeGold, removeGold } from "./game/currency";
import { BANK_POSITION, CHOP_MS, MAX_INVENTORY_SLOTS, MAX_OFFLINE_MS, RESPAWN_MS, SAVE_KEY } from "./game/data/world";
import { formatDuration, formatNumber, initialGame, moveToBank, moveToNextTree, moveToTree, restoreTrees, walkTime } from "./game/lib/game-state";
import { addInventoryItems, addNotedInventoryItems, emptyInventorySlots, inventoryItemCount, inventorySlotItemId, inventorySlotsUsed, isNoteableItem, itemCount, normalizeInventorySlots, normalizeItemCounts, notedInventoryCapacity, removeInventoryItems, setItemCount } from "./game/lib/inventory";
import { AXES, AXE_BY_ID, GEAR, ITEMS } from "./game/items";
import { CITY_BANK, storeAcceptsItem, STORE_ORDER, STORES } from "./game/shops";
import { equippedWoodcuttingAxe, hasWoodcuttingAxe, LOG_ITEM_IDS, MAX_WOODCUTTING_XP, WOODCUTTING, WOODCUTTING_TREE_BY_ID, WOODCUTTING_XP_PER_LOG, woodcuttingLevelFromXp, xpForWoodcuttingLevel } from "./game/skills";
import type { AxeId, BankItemId, BankMenuMode, EquipmentSlot, EquipmentState, GameState, GearId, InventorySlots, ItemCounts, ItemId, OfflineSummary, Panel, StoreId, StoreTradeMode, TreeState } from "./game/types";

function inventoryLogCount(slots:InventorySlots) {
  return LOG_ITEM_IDS.reduce((total,id) => total+inventoryItemCount(slots,id),0);
}

function bankLogCount(items:ItemCounts) {
  return LOG_ITEM_IDS.reduce((total,id) => total+itemCount(items,id),0);
}

export default function Home() {
  const [game, setGame] = useState<GameState>(initialGame);
  const [hydrated, setHydrated] = useState(false);
  const [panel, setPanel] = useState<Panel>("inventory");
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [welcome, setWelcome] = useState(true);
  const [bankOpen, setBankOpen] = useState(false);
  const [activeStore, setActiveStore] = useState<StoreId|null>(null);
  const [selectedStoreItem, setSelectedStoreItem] = useState<ItemId|null>(null);
  const [storeTradeMode, setStoreTradeMode] = useState<StoreTradeMode>("sell");
  const [storeNotice, setStoreNotice] = useState("Select an item to begin trading.");
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const [moveMarker, setMoveMarker] = useState<{x:number;y:number} | null>(null);
  const [gearNotice, setGearNotice] = useState("Click a filled slot to unequip it.");
  const [woodcuttingNotice, setWoodcuttingNotice] = useState("Choose a tree to see its Woodcutting requirement.");
  const [selectedBankItem, setSelectedBankItem] = useState<ItemId>("iron-hatchet");
  const [bankCompanionPanel, setBankCompanionPanel] = useState<"inventory"|"equipment">("inventory");
  const [withdrawAsNote, setWithdrawAsNote] = useState(false);
  const [bankMenu, setBankMenu] = useState<{item:BankItemId;mode:BankMenuMode;slotIndex?:number;x:number;y:number;custom:boolean} | null>(null);
  const [customWithdrawAmount, setCustomWithdrawAmount] = useState("1");
  const latestGame = useRef(game);

  useEffect(() => { latestGame.current = game; }, [game]);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    let restoredGame:GameState|null = null;
    let restoredOffline:OfflineSummary|null = null;
    let hasSave = false;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        hasSave = true;
        const saved = JSON.parse(raw) as Partial<GameState> & { lastSeen?:number;inventoryItems?:ItemCounts;inventoryLogs?:number;bankLogs?:number;inventoryGear?:GearId[];bankGear?:AxeId[] };
        const base = initialGame();
        const savedTrees = restoreTrees(saved.trees,now);
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
        const offlineXp = offlineLogs * WOODCUTTING_XP_PER_LOG;
        bankItems=setItemCount(bankItems,"logs",itemCount(bankItems,"logs")+offlineLogs);
        restoredGame = { ...base, xp:Math.min(MAX_WOODCUTTING_XP,(saved.xp ?? 0) + offlineXp),gold:normalizeGold(saved.gold),inventorySlots,bankItems,equipment,afk:saved.afk ?? true,
          characterX:saved.characterX ?? base.characterX, characterY:saved.characterY ?? base.characterY,
          trees:savedTrees, now };
        if (offlineLogs > 0) restoredOffline = { elapsed, logs:offlineLogs, xp:offlineXp };
      }
    } catch { hasSave = false; localStorage.removeItem(SAVE_KEY); }
    queueMicrotask(() => {
      if (cancelled) return;
      if (restoredGame) setGame(restoredGame);
      if (restoredOffline) setOffline(restoredOffline);
      if (hasSave) setWelcome(false);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const save = () => {
      const current = latestGame.current;
      localStorage.setItem(SAVE_KEY, JSON.stringify({ xp:current.xp, gold:current.gold, inventorySlots:current.inventorySlots,bankItems:current.bankItems,
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
        if (inventorySlotsUsed(state) >= MAX_INVENTORY_SLOTS) return inventoryLogCount(state.inventorySlots) > 0 ? moveToBank(state,now) : { ...state, afk:false };
        return moveToNextTree(state,now);
      }
      if (state.action === "walking-point") return { ...state, action:"idle", nextActionAt:0 };
      if (state.action === "waiting") return state.afk && hasWoodcuttingAxe(state) ? moveToNextTree(state,now) : { ...state, action:"idle", afk:false };
      if (state.action === "walking-tree") {
        if (!hasWoodcuttingAxe(state)) return { ...state, action:"idle", afk:false, targetTreeId:null };
        const tree = state.trees.find(item => item.id === state.targetTreeId);
        const canCut = tree && WOODCUTTING_TREE_BY_ID[tree.species].requiredLevel<=woodcuttingLevelFromXp(state.xp);
        return tree && tree.charges > 0 && canCut ? { ...state, action:"chopping", nextActionAt:now + CHOP_MS }
          : state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
      }
      if (state.action === "chopping") {
        if (!hasWoodcuttingAxe(state)) return { ...state, action:"idle", afk:false, targetTreeId:null };
        if (inventorySlotsUsed(state) >= MAX_INVENTORY_SLOTS) return state.afk && inventoryLogCount(state.inventorySlots) > 0 ? moveToBank(state,now) : { ...state, action:"idle", targetTreeId:null };
        const index = state.trees.findIndex(item => item.id === state.targetTreeId);
        const tree = state.trees[index];
        if (!tree || tree.charges <= 0) return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
        const definition = WOODCUTTING_TREE_BY_ID[tree.species];
        if (definition.requiredLevel>woodcuttingLevelFromXp(state.xp)) return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
        const axe = equippedWoodcuttingAxe(state);
        const freeSlots = MAX_INVENTORY_SLOTS - inventorySlotsUsed(state);
        const bonusLog = axe && Math.random() < axe.bonusChance ? 1 : 0;
        const logsGained = Math.min(tree.charges,freeSlots,1 + bonusLog);
        const remaining = tree.charges - logsGained;
        const trees = state.trees.slice();
        trees[index] = { ...tree, charges:remaining, respawnAt:remaining === 0 ? now + RESPAWN_MS : 0 };
        state = { ...state, trees, inventorySlots:addInventoryItems(state.inventorySlots,definition.logId,logsGained), xp:Math.min(MAX_WOODCUTTING_XP,state.xp + definition.xp * logsGained) };
        if (inventorySlotsUsed(state) >= MAX_INVENTORY_SLOTS) return state.afk ? moveToBank(state,now) : { ...state, action:"idle", targetTreeId:null };
        if (remaining === 0) return state.afk ? moveToNextTree(state,now) : { ...state, action:"idle", targetTreeId:null };
        return { ...state, nextActionAt:now + CHOP_MS };
      }
      if (state.action === "walking-bank") return { ...state, action:"banking", nextActionAt:now + 650 };
      if (state.action === "banking") {
        let bankItems = state.bankItems;
        let inventorySlots = state.inventorySlots;
        LOG_ITEM_IDS.forEach(id => {
          const logs = inventoryItemCount(inventorySlots,id);
          if (logs>0) {
            bankItems=setItemCount(bankItems,id,itemCount(bankItems,id)+logs);
            inventorySlots=removeInventoryItems(inventorySlots,id,logs);
          }
        });
        state = { ...state, bankItems, inventorySlots };
        return state.afk && hasWoodcuttingAxe(state) ? moveToNextTree(state,now) : { ...state, action:"idle", nextActionAt:0 };
      }
      return state;
    }), 250);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  const level = woodcuttingLevelFromXp(game.xp);
  const levelStart = xpForWoodcuttingLevel(level);
  const nextLevelXp = level >= WOODCUTTING.maxLevel ? MAX_WOODCUTTING_XP : xpForWoodcuttingLevel(level + 1);
  const xpProgress = level >= 99 ? 100 : Math.max(0,Math.min(100,((game.xp-levelStart)/(nextLevelXp-levelStart))*100));
  const actionProgress = game.action === "chopping" ? Math.max(4,Math.min(100,(1-(game.nextActionAt-game.now)/CHOP_MS)*100)) : xpProgress;
  const inventoryUsed = inventorySlotsUsed(game);
  const bankLogs = bankLogCount(game.bankItems);
  const firstInventoryItem = game.inventorySlots.map(inventorySlotItemId).find((item):item is ItemId => Boolean(item)) ?? null;
  const equippedCount = Object.values(game.equipment).filter(Boolean).length;
  const currentAxe = equippedWoodcuttingAxe(game);
  const selectedItem = ITEMS[selectedBankItem];
  const selectedItemEquipped = ITEMS[selectedBankItem].kind!=="resource" && Object.values(game.equipment).includes(selectedBankItem as GearId);
  const selectedItemInPack = inventoryItemCount(game.inventorySlots,selectedBankItem)>0;
  const selectedItemInBank = itemCount(game.bankItems,selectedBankItem)>0;
  const bankCatalog = (Object.keys(ITEMS) as ItemId[]).filter(id => itemCount(game.bankItems,id)>0);
  const actionText = useMemo(() => {
    const targetTree = game.trees.find(tree => tree.id===game.targetTreeId);
    const targetName = targetTree ? WOODCUTTING_TREE_BY_ID[targetTree.species].name.toLowerCase() : "tree";
    if (game.action === "walking-point") return "Walking across the city";
    if (game.action === "walking-tree") return `Walking to the ${targetName}`;
    if (game.action === "chopping") return `Chopping the ${targetName}`;
    if (game.action === "walking-bank") return "Walking to the bank";
    if (game.action === "banking") return "Depositing logs";
    if (game.action === "waiting") return "Waiting for a tree";
    if (!hasWoodcuttingAxe(game)) return "Equip an axe to chop";
    if (inventoryUsed >= MAX_INVENTORY_SLOTS) return "Inventory full";
    return game.afk ? "Finding a tree" : "Ready to explore";
  },[game,inventoryUsed]);

  const chooseTree = (tree:TreeState) => {
    const definition = WOODCUTTING_TREE_BY_ID[tree.species];
    if (!hasWoodcuttingAxe(game)) { setPanel("equipment"); setPanelMinimized(false); setGearNotice("Equip an axe before cutting trees."); return; }
    if (level<definition.requiredLevel) {
      setPanel("skills"); setPanelMinimized(false);
      setWoodcuttingNotice(`${definition.name} requires Woodcutting level ${definition.requiredLevel}. Your level is ${level}.`);
      return;
    }
    if (inventoryUsed >= MAX_INVENTORY_SLOTS) { setWoodcuttingNotice("Your inventory is full. Bank or sell items before chopping."); return; }
    if (tree.charges <= 0) return;
    setWelcome(false); setBankOpen(false); setActiveStore(null);
    setWoodcuttingNotice(`${definition.name}: level ${definition.requiredLevel} · ${formatNumber(definition.xp)} XP per log.`);
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
    setWelcome(false); setActiveStore(null); setBankOpen(true);
    const now = Date.now();
    setGame(previous => ({...previous,afk:false,action:"walking-point",targetTreeId:null,characterX:BANK_POSITION.x,
      characterY:BANK_POSITION.y,nextActionAt:now+walkTime(previous.characterX,previous.characterY,BANK_POSITION.x,BANK_POSITION.y),now}));
  };

  const visitStore = (storeId:StoreId) => {
    const store = STORES[storeId];
    const firstStockItem = store.stock[0] ?? null;
    const firstInventoryItem = game.inventorySlots.map(inventorySlotItemId).find((item):item is ItemId => item!==null && storeAcceptsItem(storeId,item)) ?? null;
    setWelcome(false); setBankOpen(false); setBankMenu(null); setActiveStore(storeId);
    setSelectedStoreItem(firstStockItem ?? firstInventoryItem); setStoreTradeMode(firstStockItem ? "buy" : "sell");
    setStoreNotice(firstStockItem ? "Select shop stock to view its price, or choose an inventory item to sell." : storeId==="general" ? "Choose any inventory item to sell." : `Welcome to ${store.name}.`);
    const now = game.now;
    setGame(previous => ({...previous,afk:false,action:"walking-point",targetTreeId:null,characterX:store.doorX,
      characterY:store.doorY,nextActionAt:now+walkTime(previous.characterX,previous.characterY,store.doorX,store.doorY),now}));
  };

  const sellStoreItem = (item:ItemId,requested:number) => {
    if (!activeStore || !storeAcceptsItem(activeStore,item)) {setStoreNotice(`${STORES[activeStore ?? "general"].name} does not buy that item.`);return;}
    const available = inventoryItemCount(game.inventorySlots,item);
    const amount = Math.min(Math.max(0,Math.floor(requested)),available);
    if (amount<=0) {setStoreNotice(`You have no ${ITEMS[item].name.toLowerCase()} to sell.`);return;}
    const earned = ITEMS[item].value*amount;
    setGame(previous => {
      const safeAmount = Math.min(amount,inventoryItemCount(previous.inventorySlots,item));
      if (safeAmount<=0) return previous;
      return {...previous,gold:addGold(previous.gold,ITEMS[item].value*safeAmount),
        inventorySlots:removeInventoryItems(previous.inventorySlots,item,safeAmount),now:Date.now()};
    });
    setStoreNotice(`Sold ${amount} ${amount===1 ? ITEMS[item].name : ITEMS[item].name.toLowerCase()} for ${formatGold(earned)} gold.`);
    if (amount>=available) setSelectedStoreItem(null);
  };

  const buyStoreItem = (item:ItemId) => {
    if (!activeStore || !STORES[activeStore].stock.includes(item)) {setStoreNotice("That item is not stocked by this shop.");return;}
    const price = ITEMS[item].value;
    if (inventoryUsed>=MAX_INVENTORY_SLOTS) {setStoreNotice("Your inventory is full.");return;}
    if (game.gold<price) {setStoreNotice(`You need ${formatGold(price-game.gold)} more gold.`);return;}
    setGame(previous => {
      if (inventorySlotsUsed(previous)>=MAX_INVENTORY_SLOTS || previous.gold<price) return previous;
      return {...previous,gold:removeGold(previous.gold,price),inventorySlots:addInventoryItems(previous.inventorySlots,item,1),now:Date.now()};
    });
    setStoreNotice(`${ITEMS[item].name} purchased for ${formatGold(price)} gold.`);
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
      return {...previous,bankItems,inventorySlots:emptyInventorySlots(),now:Date.now()};
    });
    setGearNotice(`${inventoryUsed} inventory ${inventoryUsed===1 ? "item" : "items"} deposited.`);
    setBankMenu(null);
  };

  const equipGear = (id:GearId) => {
    const item = GEAR[id];
    if (item.requiredLevel > level) { setGearNotice(`${item.name} requires ${WOODCUTTING.name} level ${item.requiredLevel}.`); return; }
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
    const desired = Number.isFinite(requested) ? Math.max(0,Math.floor(requested)) : 0;
    const useNote = withdrawAsNote && isNoteableItem(item);
    const amount = Math.min(desired,available,useNote ? notedInventoryCapacity(game.inventorySlots,item) : freeSlots);
    if (amount <= 0) {
      setGearNotice(available<=0 ? "That item is not currently in the bank." : "Your inventory is full.");
      setBankMenu(null); return;
    }
    setGame(previous => {
      const previousAvailable = itemCount(previous.bankItems,item);
      const safeAmount = useNote
        ? Math.min(amount,previousAvailable,notedInventoryCapacity(previous.inventorySlots,item))
        : Math.min(amount,MAX_INVENTORY_SLOTS-inventorySlotsUsed(previous),previousAvailable);
      if (safeAmount <= 0) return previous;
      return {...previous,bankItems:setItemCount(previous.bankItems,item,itemCount(previous.bankItems,item)-safeAmount),
        inventorySlots:useNote ? addNotedInventoryItems(previous.inventorySlots,item,safeAmount) : addInventoryItems(previous.inventorySlots,item,safeAmount),now:Date.now()};
    });
    setGearNotice(`${amount} ${amount===1 ? ITEMS[item].name : ITEMS[item].name.toLowerCase()} withdrawn${useNote ? " as a noted stack" : ""}.`);
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
    setWelcome(false); setBankOpen(false); setActiveStore(null); setMoveMarker({x,y});
    setGame(previous => ({ ...previous, afk:false, action:"walking-point", targetTreeId:null,
      characterX:x, characterY:y, nextActionAt:now + walkTime(previous.characterX,previous.characterY,x,y), now }));
  };

  const walkWithKeyboard = (event:ReactKeyboardEvent<HTMLDivElement>) => {
    const directions:Record<string,[number,number]> = {ArrowLeft:[-4,0],ArrowRight:[4,0],ArrowUp:[0,-4],ArrowDown:[0,4]};
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const x = Math.max(2,Math.min(98,game.characterX+direction[0]));
    const y = Math.max(2,Math.min(98,game.characterY+direction[1]));
    const now = game.now;
    setWelcome(false); setBankOpen(false); setActiveStore(null); setMoveMarker({x,y});
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
      <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><i/><b/></span><div><h1>Tallowmere</h1><p>City of trades and old roads</p></div></div>
      <div className="player-stats" aria-label="Player stats">
        <div className="stat-pill"><span className="stat-icon stat-icon--star">✦</span><div><small>{WOODCUTTING.name}</small><strong>Level {level}</strong></div></div>
        <div className="stat-pill"><span className="stat-icon stat-icon--log"/><div><small>Banked logs</small><strong>{formatNumber(bankLogs)}</strong></div></div>
        <div className="stat-pill stat-pill--gold"><span className="stat-icon stat-icon--gold"><GoldStackIcon amount={game.gold} size="small"/></span><div><small>Gold</small><strong>{formatGold(game.gold)}</strong></div></div>
        <div className="world-size"><span/>100 × 100 TILES</div>
      </div>
    </header>

    <section className="world-card" aria-label="Tallowmere City game world">
      <div className="world-map">
        <div className="world-layer world-layer--city" style={{ transform:`translate(${cameraX}%, ${cameraY}%)` }} onClick={walkToPoint} onKeyDown={walkWithKeyboard} role="button" tabIndex={0} aria-label="Tallowmere City. Click the ground or use arrow keys to walk.">
          {/* eslint-disable-next-line @next/next/no-img-element -- this public image is also used by the GitHub Pages build */}
          <img className="city-map-art" src="tallowmere-city.png" alt="" aria-hidden="true" draggable="false"/>
          {game.trees.map(tree => <PixelTree key={tree.id} tree={tree} selected={game.targetTreeId===tree.id} chopping={game.action==="chopping" && game.targetTreeId===tree.id} now={game.now} level={level} onChoose={() => chooseTree(tree)}/>)}
          <CityBuilding building={CITY_BANK} onVisit={visitBank}/>
          {STORE_ORDER.map(storeId => <CityBuilding key={storeId} building={STORES[storeId]} onVisit={() => visitStore(storeId)}/>)}

          <div className={`player-character player-character--${game.action} ${game.equipment.head ? "player-character--head-equipped" : "player-character--bare-head"} ${game.equipment.body ? "player-character--body-equipped" : "player-character--no-body"} ${game.equipment.shield ? "player-character--shield-equipped" : ""} ${game.equipment.legs ? "player-character--legs-equipped" : "player-character--no-legs"}`} style={{left:`${game.characterX}%`,top:`${game.characterY}%`,"--axe-metal":currentAxe?.metal ?? "#a76b3f","--axe-edge":currentAxe?.edge ?? "#d19a62","--axe-handle":currentAxe?.handle ?? "#6e462a"} as CSSProperties} aria-label={`Your character is ${actionText.toLowerCase()}`}>
            <span className="character-shadow"/><span className="character-hair"/><span className="character-head"/><span className="character-body"/>
            <span className="character-cloak"/><span className="character-shield"/><span className="character-belt"/><span className="character-arm"/><span className="character-legs"/><span className="character-axe"><i/><b/></span>
          </div>
          {moveMarker && game.action === "walking-point" && <span className="movement-marker" style={{left:`${moveMarker.x}%`,top:`${moveMarker.y}%`}} aria-hidden="true"><i/></span>}
        </div>

        <div className="region-plaque" aria-hidden="true"><small>TALLOWMERE PROVINCE</small><strong>Tallowmere City</strong></div>
        <div className="movement-hint" aria-hidden="true"><span>✥</span> Click the ground to move</div>
        <div className="woodcutting-notice" aria-live="polite">{woodcuttingNotice}</div>

        {welcome && <aside className="welcome-card">
          <button className="welcome-close" type="button" aria-label="Close welcome card" onClick={() => setWelcome(false)}>×</button>
          <span className="eyebrow">THE CITY GATES ARE OPEN</span><h2>Welcome to Tallowmere City</h2>
          <p>Visit the bank, sell gathered logs at the General Store, and explore the city&apos;s weapon, armor, and skills merchants.</p>
          <button className="welcome-action" type="button" onClick={() => setWelcome(false)}>Enter the city <span>›</span></button>
        </aside>}

        {bankOpen && <aside className="bank-panel bank-panel--vault" aria-label="Tallowmere bank interior">
          <div className="bank-classic-title"><span className="bank-title-gold"><GoldStackIcon amount={game.gold} size="tiny"/><b>{formatGold(game.gold)}</b></span><strong>The Bank of Tallowmere</strong><button type="button" onClick={() => {setBankOpen(false);setBankMenu(null);}} aria-label="Close bank">×</button></div>
          <div className="bank-workspace">
            <div className="bank-vault-main">
              <div className="bank-classic-grid" aria-label="Stored items">
                <div className="bank-item bank-item--currency" aria-label={`${formatGold(game.gold)} gold in one bank stack`}>
                  <GoldStackIcon amount={game.gold} size="medium"/><span>{formatGold(game.gold)}</span><small>Gold</small>
                </div>
                {bankCatalog.map(id => {
                  const item = ITEMS[id];
                  const inBank = itemCount(game.bankItems,id);
                  const locked = level < item.requiredLevel;
                  return <button className={`bank-item ${item.kind==="resource" ? "bank-item--logs" : "bank-item--item"} ${locked ? "bank-item--locked" : ""} ${selectedBankItem===id ? "bank-item--selected" : ""}`} type="button" key={id}
                    onClick={() => {setSelectedBankItem(id);withdrawBankItem(id,1);}} onContextMenu={event => {setSelectedBankItem(id);openBankMenu(event,id,"withdraw");}}
                    title={`${item.name} — left-click withdraws 1${withdrawAsNote && isNoteableItem(id) ? " as a note" : ""}, right-click for more options`}>
                    <ItemIcon id={id}/><span>{item.kind==="resource" ? formatNumber(inBank) : `Lv ${item.requiredLevel}`}</span><small>{formatNumber(inBank)}</small>
                  </button>;
                })}
              </div>
              <div className="bank-selected-item"><ItemIcon id={selectedItem.id}/><div><small>SELECTED ITEM</small><strong>{selectedItem.name}</strong><span>{selectedItem.kind==="axe" ? `${WOODCUTTING.name} ${selectedItem.requiredLevel} · ${Math.round(AXE_BY_ID[selectedItem.id as AxeId].bonusChance*100)}% extra-log chance` : selectedItem.description}</span></div>
                {selectedItemEquipped ? <button type="button" disabled>Equipped</button> : selectedItemInBank ? <button type="button" onClick={() => withdrawBankItem(selectedBankItem,1)}>Withdraw{withdrawAsNote && isNoteableItem(selectedBankItem) ? " note" : ""} 1</button> : selectedItemInPack ? <button type="button" onClick={() => depositInventoryItem(selectedBankItem,1)}>Store 1</button> : <button type="button" disabled>Unavailable</button>}
              </div>
              <div className="bank-classic-controls">
                <button type="button" className="bank-deposit" disabled={inventoryUsed===0} onClick={depositEntireInventory}>{inventoryUsed>0 ? `Deposit inventory (${inventoryUsed})` : "Inventory empty"}</button>
                <button type="button" role="switch" aria-checked={withdrawAsNote} className={`bank-note-toggle ${withdrawAsNote ? "bank-note-toggle--on" : ""}`} onClick={() => {setWithdrawAsNote(value => !value);setBankMenu(null);setGearNotice(withdrawAsNote ? "Normal item withdrawal enabled." : "Withdraw as Note enabled.");}}>
                  <span className="bank-note-toggle__icon" aria-hidden="true">N</span><span><strong>Withdraw as Note</strong><small>{withdrawAsNote ? "ON · stacks in one slot" : "OFF · normal items"}</small></span>
                </button>
                <span>{gearNotice}</span><small>Bank: left withdraws · right opens options</small>
              </div>
            </div>
            <div className="bank-companion" aria-label="Inventory and equipment">
              <div className="bank-companion-tabs">
                <button type="button" className={bankCompanionPanel==="inventory" ? "bank-companion-tab--active" : ""} onClick={() => setBankCompanionPanel("inventory")}><span className="tab-bag"><i/></span>Inventory</button>
                <button type="button" className={bankCompanionPanel==="equipment" ? "bank-companion-tab--active" : ""} onClick={() => setBankCompanionPanel("equipment")}><span className="tab-equipment"><i/><b/></span>Equipment</button>
              </div>
              {bankCompanionPanel === "inventory" ? <div className="bank-pack-panel">
                <div className="bank-pack-heading"><div><strong>Inventory</strong><small>{inventoryUsed} / 28 slots</small></div><b>{28-inventoryUsed}</b></div>
                <div className="bank-pack-currency" aria-label={`${formatGold(game.gold)} gold`}><GoldStackIcon amount={game.gold} size="small"/><span><small>Gold balance</small><strong>{formatGold(game.gold)}</strong></span></div>
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
              <button type="button" onClick={() => transferFromBankMenu(1)}>{bankMenu.mode === "withdraw" ? withdrawAsNote && isNoteableItem(bankMenu.item) ? "Withdraw noted" : "Withdraw" : "Deposit"} 1</button>
              <button type="button" onClick={() => transferFromBankMenu(5)}>{bankMenu.mode === "withdraw" ? withdrawAsNote && isNoteableItem(bankMenu.item) ? "Withdraw noted" : "Withdraw" : "Deposit"} 5</button>
              <button type="button" onClick={() => transferFromBankMenu(10)}>{bankMenu.mode === "withdraw" ? withdrawAsNote && isNoteableItem(bankMenu.item) ? "Withdraw noted" : "Withdraw" : "Deposit"} 10</button>
              <button type="button" onClick={() => transferFromBankMenu(bankMenu.mode === "withdraw" ? itemCount(game.bankItems,bankMenu.item) : inventoryItemCount(game.inventorySlots,bankMenu.item))}>{bankMenu.mode === "withdraw" ? withdrawAsNote && isNoteableItem(bankMenu.item) ? "Withdraw noted" : "Withdraw" : "Deposit"} all</button>
              <button type="button" onClick={() => setBankMenu({...bankMenu,custom:true})}>{bankMenu.mode === "withdraw" ? "Withdraw X…" : "Deposit X…"}</button>
              <button type="button" className="bank-menu-cancel" onClick={() => setBankMenu(null)}>Cancel</button>
            </> : <form onSubmit={event => {event.preventDefault();transferFromBankMenu(Number(customWithdrawAmount));}}>
              <label htmlFor="custom-withdraw">Amount</label><input id="custom-withdraw" type="number" min="1" max={bankMenu.mode === "withdraw" ? itemCount(game.bankItems,bankMenu.item) : inventoryItemCount(game.inventorySlots,bankMenu.item)} value={customWithdrawAmount} onChange={event => setCustomWithdrawAmount(event.target.value)}/>
              <div><button type="submit">{bankMenu.mode === "withdraw" ? withdrawAsNote && isNoteableItem(bankMenu.item) ? "Withdraw note" : "Withdraw" : "Deposit"}</button><button type="button" onClick={() => setBankMenu({...bankMenu,custom:false})}>Back</button></div>
            </form>}
          </div>}
        </aside>}

        {activeStore && <StorePanel store={STORES[activeStore]} inventorySlots={game.inventorySlots} gold={game.gold} level={level}
          selectedItem={selectedStoreItem} tradeMode={storeTradeMode} notice={storeNotice} onSelect={(item,mode) => {setSelectedStoreItem(item);setStoreTradeMode(mode);setStoreNotice(mode==="buy" ? `${ITEMS[item].name} costs ${formatGold(ITEMS[item].value)} gold.` : storeAcceptsItem(activeStore,item) ? `${ITEMS[item].name} sells for ${formatGold(ITEMS[item].value)} gold each.` : `${STORES[activeStore].name} does not buy that item.`);}}
          onSell={sellStoreItem} onBuy={buyStoreItem} onMove={moveInventorySlot} onClose={() => setActiveStore(null)}/>}

        <div className="status-dock" aria-live="polite">
          <span className="status-avatar"><i/></span><div className="status-copy"><small>Current action</small><strong>{actionText}</strong></div>
          <div className="status-divider"/><div className="xp-summary"><small>{WOODCUTTING.name} XP</small><strong>{formatNumber(game.xp)} <span>/ {level>=WOODCUTTING.maxLevel ? "MAX" : formatNumber(nextLevelXp)} XP</span></strong></div>
          <div className="xp-bar" title={game.action==="chopping" ? "Chop progress" : "Level progress"}><span style={{width:`${actionProgress}%`}}/></div>
        </div>

        <aside className={`side-panel ${panelMinimized ? "side-panel--minimized" : ""} ${bankOpen || activeStore ? "side-panel--bank-open" : ""}`}>
          <div className="panel-tabs" aria-label="Game panels">
            <button className="panel-minimize" type="button" aria-label={panelMinimized ? "Open game panel" : "Minimize game panel"} aria-expanded={!panelMinimized} onClick={() => setPanelMinimized(value => !value)}>{panelMinimized ? "▴" : "—"}</button>
            <button className={`panel-tab ${panel==="skills" ? "panel-tab--active" : ""}`} type="button" aria-label={`${WOODCUTTING.name} skill`} aria-pressed={panel==="skills"} onClick={() => {setPanel("skills");setPanelMinimized(false);}}><span className="tab-axe"><i/><b/></span></button>
            <button className={`panel-tab ${panel==="equipment" ? "panel-tab--active" : ""}`} type="button" aria-label="Equipment" aria-pressed={panel==="equipment"} onClick={() => {setPanel("equipment");setPanelMinimized(false);}}><span className="tab-equipment"><i/><b/></span></button>
            <button className={`panel-tab ${panel==="inventory" ? "panel-tab--active" : ""}`} type="button" aria-label="Inventory" aria-pressed={panel==="inventory"} onClick={() => {setPanel("inventory");setPanelMinimized(false);}}><span className="tab-bag"><i/></span></button>
          </div>
          {!panelMinimized && <div className="inventory-panel">
            {panel === "inventory" ? <>
              <div className="panel-heading"><div><span>Inventory</span><small>{inventoryUsed} / 28 slots</small></div><b>{28-inventoryUsed}</b></div>
              <InventoryGrid slots={game.inventorySlots} level={level} onMove={moveInventorySlot}
                onActivate={itemId => ITEMS[itemId].kind!=="resource" && equipGear(itemId as GearId)}/>
              <p className="inventory-help">Drag items to rearrange your pack.</p>
              <div className="item-detail">{firstInventoryItem ? <><ItemIcon id={firstInventoryItem} small/><div><strong>{ITEMS[firstInventoryItem].name}</strong><small>{ITEMS[firstInventoryItem].kind==="resource" ? `${inventoryItemCount(game.inventorySlots,firstInventoryItem)} ready to bank` : ITEMS[firstInventoryItem].description}</small></div></> : <><LogIcon small/><div><strong>Empty pack</strong><small>Your pack is ready</small></div></>}</div>
            </> : panel === "skills" ? <div className="skill-panel">
              <div className="panel-heading"><div><span>Skills</span><small>1 skill available</small></div><b>1</b></div>
              <div className="skill-card"><span className="skill-card__icon"><span className="tab-axe"><i/><b/></span></span><div className="skill-card__copy"><small>{WOODCUTTING.name.toUpperCase()}</small><strong>Level {level}</strong><span>{formatNumber(game.xp)} XP</span></div></div>
              <div className="skill-progress"><div><span>Level {level}</span><b>{level>=WOODCUTTING.maxLevel ? "Maximum level" : `${formatNumber(nextLevelXp-game.xp)} XP to ${level+1}`}</b></div><i><span style={{width:`${xpProgress}%`}}/></i></div>
              <div className="xp-boost"><strong>{WOODCUTTING.xpMultiplier}× XP active</strong><span>Higher-level trees grant more XP</span></div>
              <p className="woodcutting-panel-notice">{woodcuttingNotice}</p>
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
