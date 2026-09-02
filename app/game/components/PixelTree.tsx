import type { TreeState } from "../types";

export function PixelTree({tree,selected,chopping,now,onChoose}:{tree:TreeState;selected:boolean;chopping:boolean;now:number;onChoose:()=>void}) {
  const depleted = tree.charges<=0;
  const seconds = Math.max(0,Math.ceil((tree.respawnAt-now)/1000));
  return (
    <button className={`pixel-tree ${depleted ? "pixel-tree--stump" : ""} ${selected ? "pixel-tree--selected" : ""} ${chopping ? "pixel-tree--chopping" : ""}`}
      style={{left:`${tree.x}%`,top:`${tree.y}%`}} onClick={event => {event.stopPropagation();onChoose();}} disabled={depleted}
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
