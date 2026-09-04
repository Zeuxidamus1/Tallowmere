import type { TreeState } from "../types";
import { WOODCUTTING_TREE_BY_ID } from "../skills";

export function PixelTree({tree,selected,chopping,now,level,onChoose}:{tree:TreeState;selected:boolean;chopping:boolean;now:number;level:number;onChoose:()=>void}) {
  const depleted = tree.charges<=0;
  const seconds = Math.max(0,Math.ceil((tree.respawnAt-now)/1000));
  const definition = WOODCUTTING_TREE_BY_ID[tree.species];
  const locked = level<definition.requiredLevel;
  return (
    <button className={`pixel-tree pixel-tree--${tree.species} ${depleted ? "pixel-tree--stump" : ""} ${locked ? "pixel-tree--locked" : ""} ${selected ? "pixel-tree--selected" : ""} ${chopping ? "pixel-tree--chopping" : ""}`}
      style={{left:`${tree.x}%`,top:`${tree.y}%`}} onClick={event => {event.stopPropagation();onChoose();}} disabled={depleted}
      title={depleted ? `${definition.name} respawning in ${seconds} seconds` : locked ? `${definition.name} requires Woodcutting level ${definition.requiredLevel}` : `${definition.name} — ${tree.charges} logs remaining`}
      aria-label={depleted ? `${definition.name} respawning in ${seconds} seconds` : locked ? `${definition.name}, requires Woodcutting level ${definition.requiredLevel}` : `${definition.name} with about ${tree.charges} logs remaining`}>
      {depleted ? <><span className="stump-shadow"/><span className="tree-stump"/><small>{seconds}s</small></> : <>
        <span className="tree-shadow"/>
        {/* eslint-disable-next-line @next/next/no-img-element -- public tree art must also work in the GitHub Pages build */}
        <img className="tree-art" src={definition.image} alt="" aria-hidden="true" draggable="false"/>
        {locked && <span className="tree-level-badge">Lv {definition.requiredLevel}</span>}
        {selected && <span className="tree-target"/>}
        {chopping && <span className="wood-chips"><i/><b/><em/></span>}
      </>}
    </button>
  );
}
