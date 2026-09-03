import { formatGold } from "../currency";
import { ITEMS } from "../items";
import { inventoryItemCount, inventorySlotsUsed } from "../lib/inventory";
import { storeAcceptsItem, type StoreDefinition } from "../shops";
import { WOODCUTTING } from "../skills";
import type { InventorySlots, ItemId, StoreTradeMode } from "../types";
import { GoldStackIcon } from "./GoldStackIcon";
import { InventoryGrid } from "./InventoryGrid";
import { ItemIcon } from "./ItemIcons";

function itemSubtitle(item:ItemId) {
  const definition = ITEMS[item];
  if (definition.kind==="axe") return `${WOODCUTTING.name} ${definition.requiredLevel}`;
  if (definition.kind==="armor") return `${definition.slot} armor`;
  return definition.category;
}

export function StorePanel({store,inventorySlots,gold,level,selectedItem,tradeMode,notice,onSelect,onSell,onBuy,onMove,onClose}:{
  store:StoreDefinition; inventorySlots:InventorySlots; gold:number; level:number; selectedItem:ItemId|null; tradeMode:StoreTradeMode; notice:string;
  onSelect:(item:ItemId,mode:StoreTradeMode)=>void; onSell:(item:ItemId,amount:number)=>void; onBuy:(item:ItemId)=>void;
  onMove:(from:number,to:number)=>void; onClose:()=>void;
}) {
  const inventoryUsed = inventorySlotsUsed({inventorySlots});
  const shopStock = Array.from(new Set(store.stock));
  const selectedDefinition = selectedItem ? ITEMS[selectedItem] : null;
  const selectedQuantity = selectedItem ? inventoryItemCount(inventorySlots,selectedItem) : 0;
  const selectedIsStocked = selectedItem ? shopStock.includes(selectedItem) : false;
  const selectedIsAccepted = selectedItem ? storeAcceptsItem(store.id,selectedItem) : false;
  const canBuy = Boolean(selectedDefinition && selectedIsStocked && inventoryUsed<28 && gold>=selectedDefinition.value);
  const canSell = Boolean(selectedDefinition && selectedIsAccepted && selectedQuantity>0);

  return <aside className={`store-panel store-panel--${store.id}`} role="dialog" aria-modal="true" aria-labelledby="store-title">
    <header className="store-header">
      <span className="store-header__crest" aria-hidden="true">{store.icon}</span>
      <div><small>{store.keeper}, proprietor</small><h2 id="store-title">{store.name}</h2></div>
      <div className="store-gold" aria-label={`${formatGold(gold)} gold`}><GoldStackIcon amount={gold} size="small"/><strong>{formatGold(gold)}</strong><small>gold</small></div>
      <button className="store-close" type="button" onClick={onClose} aria-label={`Close ${store.name}`}>×</button>
    </header>

    <div className="store-body store-body--shared">
      <section className="store-catalog" aria-label={`${store.name} stock`}>
        <div className="store-keeper-strip"><span aria-hidden="true">{store.icon}</span><div><strong>{store.keeper}</strong><p>{store.description}</p></div></div>
        <div className="store-section-heading"><div><small>SHOP STOCK</small><strong>Items for sale</strong></div><span>{shopStock.length}</span></div>
        {shopStock.length>0 ? <div className="store-item-grid">
          {shopStock.map(itemId => {
            const item = ITEMS[itemId];
            const locked = item.requiredLevel>level;
            return <button type="button" className={`store-grid-item ${selectedItem===itemId && tradeMode==="buy" ? "store-grid-item--selected" : ""} ${locked ? "store-grid-item--locked" : ""}`} key={itemId}
              onClick={() => onSelect(itemId,"buy")} aria-label={`Buy ${item.name}, ${formatGold(item.value)} gold, unlimited stock`} title={`${item.name} — ${formatGold(item.value)} gold`}>
              <span className="store-grid-item__quantity">∞</span><ItemIcon id={itemId}/><strong>{item.name}</strong><small>{formatGold(item.value)} gp</small>
            </button>;
          })}
        </div> : <div className="store-empty-stock"><span aria-hidden="true">{store.icon}</span><strong>{store.id==="skills" ? WOODCUTTING.name : "No stocked goods"}</strong><p>{store.id==="general" ? "This merchant buys items from your inventory instead of selling stock." : store.id==="skills" ? `Level ${level} · ${WOODCUTTING.xpMultiplier}× experience. New skill supplies will appear here when added.` : "New items will appear here automatically when added to this shop."}</p></div>}

        <div className="store-trade-card" aria-live="polite">
          {selectedDefinition && selectedItem ? <>
            <div className="store-selected-item"><ItemIcon id={selectedItem}/><div><small>{tradeMode==="buy" ? "BUYING" : "SELLING"}</small><strong>{selectedDefinition.name}</strong><span>{itemSubtitle(selectedItem)} · {selectedQuantity} in your pack</span></div></div>
            <div className="store-price-pair">
              <div><small>BUY PRICE</small><strong>{selectedIsStocked ? <><GoldStackIcon amount={selectedDefinition.value} size="tiny"/>{formatGold(selectedDefinition.value)}</> : "—"}</strong></div>
              <div><small>SELL PRICE</small><strong>{selectedIsAccepted ? <><GoldStackIcon amount={selectedDefinition.value} size="tiny"/>{formatGold(selectedDefinition.value)}</> : "—"}</strong></div>
            </div>
            {tradeMode==="buy" ? <div className="store-buy-action"><button type="button" disabled={!canBuy} onClick={() => onBuy(selectedItem)}>{inventoryUsed>=28 ? "Inventory full" : gold<selectedDefinition.value ? "Not enough gold" : selectedIsStocked ? "Buy 1" : "Not stocked"}</button></div>
              : selectedIsAccepted ? <div className="store-sell-actions">
                {[1,5,10].map(amount => <button type="button" key={amount} disabled={!canSell || selectedQuantity<amount} onClick={() => onSell(selectedItem,amount)}>Sell {amount}</button>)}
                <button type="button" className="store-sell-all" disabled={!canSell} onClick={() => onSell(selectedItem,selectedQuantity)}>Sell all {selectedQuantity}</button>
              </div> : <p className="store-unavailable">This shop does not buy {selectedDefinition.name.toLowerCase()}.</p>}
          </> : <div className="store-empty-selection"><span aria-hidden="true">¤</span><div><strong>Select an item</strong><p>Choose shop stock to buy, or an inventory item to sell.</p></div></div>}
        </div>
      </section>

      <aside className="store-inventory" aria-label="Player inventory">
        <div className="store-section-heading"><div><small>YOUR INVENTORY</small><strong>Select an item to sell</strong></div><span>{inventoryUsed}/28</span></div>
        <div className="store-pack-gold"><GoldStackIcon amount={gold} size="small"/><span><small>Gold balance</small><strong>{formatGold(gold)}</strong></span></div>
        <InventoryGrid slots={inventorySlots} level={level} mode="sell" onMove={onMove} onActivate={item => onSelect(item,"sell")}/>
        <p>Drag items to rearrange. Click an item to see its sell value and available actions.</p>
      </aside>
    </div>

    <footer className="store-footer"><span>{notice}</span><small>Gold and inventory save automatically</small></footer>
  </aside>;
}
