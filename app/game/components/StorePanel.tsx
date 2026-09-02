import { ITEMS } from "../items";
import { inventoryItemCount, inventorySlotsUsed } from "../lib/inventory";
import type { StoreDefinition } from "../shops";
import { WOODCUTTING } from "../skills";
import type { InventorySlots, ItemId } from "../types";
import { InventoryGrid } from "./InventoryGrid";
import { ItemIcon } from "./ItemIcons";

export function StorePanel({store,inventorySlots,gold,level,selectedItem,notice,onSelect,onSell,onBuy,onMove,onClose}:{
  store:StoreDefinition; inventorySlots:InventorySlots; gold:number; level:number; selectedItem:ItemId|null; notice:string;
  onSelect:(item:ItemId)=>void; onSell:(item:ItemId,amount:number)=>void; onBuy:(item:ItemId)=>void;
  onMove:(from:number,to:number)=>void; onClose:()=>void;
}) {
  const inventoryUsed = inventorySlotsUsed({inventorySlots});
  const selected = selectedItem && inventoryItemCount(inventorySlots,selectedItem)>0 ? selectedItem : null;
  const selectedQuantity = selected ? inventoryItemCount(inventorySlots,selected) : 0;
  const stock = store.stock.map(item => ITEMS[item]);

  return <aside className={`store-panel store-panel--${store.id}`} role="dialog" aria-modal="true" aria-labelledby="store-title">
    <header className="store-header">
      <span className="store-header__crest" aria-hidden="true">{store.icon}</span>
      <div><small>{store.keeper}, proprietor</small><h2 id="store-title">{store.name}</h2></div>
      <div className="store-gold" aria-label={`${gold} gold`}><span>●</span><strong>{gold.toLocaleString("en-US")}</strong><small>gold</small></div>
      <button className="store-close" type="button" onClick={onClose} aria-label={`Close ${store.name}`}>×</button>
    </header>

    <div className="store-body">
      <section className="store-merchant">
        <span className="store-merchant__portrait" aria-hidden="true"><i>{store.icon}</i></span>
        <div><small>WELCOME, TRAVELER</small><strong>{store.keeper}</strong><p>{store.description}</p></div>
      </section>

      {store.id==="general" ? <div className="store-trade-layout">
        <section className="store-inventory">
          <div className="store-section-heading"><div><small>YOUR PACK</small><strong>Choose an item to sell</strong></div><span>{inventoryUsed}/28</span></div>
          <InventoryGrid slots={inventorySlots} level={level} mode="sell" onMove={onMove} onActivate={item => onSelect(item)}/>
          <p>Every item is purchased at the gold value listed in its item file.</p>
        </section>
        <section className="store-offer" aria-live="polite">
          {selected ? <>
            <div className="store-selected-item"><ItemIcon id={selected}/><div><small>SELLING</small><strong>{ITEMS[selected].name}</strong><span>{selectedQuantity} in your pack</span></div></div>
            <div className="store-price"><small>VALUE EACH</small><strong><span>●</span>{ITEMS[selected].value.toLocaleString("en-US")}</strong></div>
            <div className="store-price store-price--total"><small>VALUE OF ALL</small><strong><span>●</span>{(ITEMS[selected].value*selectedQuantity).toLocaleString("en-US")}</strong></div>
            <div className="store-sell-actions">
              {[1,5,10].map(amount => <button type="button" key={amount} disabled={selectedQuantity<amount} onClick={() => onSell(selected,amount)}>Sell {amount}</button>)}
              <button type="button" className="store-sell-all" onClick={() => onSell(selected,selectedQuantity)}>Sell all {selectedQuantity}</button>
            </div>
          </> : <div className="store-empty-offer"><span>¤</span><strong>Select an item</strong><p>Mara will make an offer for anything in your inventory.</p></div>}
        </section>
      </div> : store.id==="skills" ? <section className="store-skill-stock">
        <div className="store-section-heading"><div><small>GUILD DISCIPLINES</small><strong>Available training</strong></div><span>1</span></div>
        <article className="store-skill-card"><span className="store-skill-card__icon">✦</span><div><small>ACTIVE SKILL</small><strong>{WOODCUTTING.name}</strong><p>{WOODCUTTING.description}</p><span>Level {level} · {WOODCUTTING.xpMultiplier}× experience</span></div></article>
        <p className="store-coming-soon">New skill tools and training supplies will be stocked as Tallowmere City expands.</p>
      </section> : <section className="store-stock">
        <div className="store-section-heading"><div><small>CITY STOCK</small><strong>{store.id==="weapons" ? "Axes & weapons" : "Armor & protection"}</strong></div><span>{stock.length}</span></div>
        <div className="store-stock-grid">
          {stock.map(item => {
            const locked = item.requiredLevel>level;
            const canAfford = gold>=item.value;
            const hasSpace = inventoryUsed<28;
            return <article className={`store-stock-item ${locked ? "store-stock-item--locked" : ""}`} key={item.id}>
              <ItemIcon id={item.id}/><div><strong>{item.name}</strong><small>{item.kind==="axe" ? `${WOODCUTTING.name} ${item.requiredLevel}` : item.slot}</small></div>
              <span className="store-stock-price">● {item.value.toLocaleString("en-US")}</span>
              <button type="button" disabled={!canAfford || !hasSpace} onClick={() => onBuy(item.id)}>{!hasSpace ? "Pack full" : canAfford ? "Buy" : "Need gold"}</button>
            </article>;
          })}
        </div>
      </section>}
    </div>
    <footer className="store-footer"><span>{notice}</span><small>Gold and inventory save automatically</small></footer>
  </aside>;
}
