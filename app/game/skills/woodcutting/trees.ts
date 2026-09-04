import type { LogId, TreeSpecies } from "../../types";

export type WoodcuttingTreeDefinition = {
  id:TreeSpecies;
  name:string;
  logId:LogId;
  requiredLevel:number;
  xp:number;
  image:string;
};

export const WOODCUTTING_TREES:WoodcuttingTreeDefinition[] = [
  {id:"normal",name:"Normal tree",logId:"logs",requiredLevel:1,xp:125,image:"assets/woodcutting/trees/normal-tree.png"},
  {id:"oak",name:"Oak tree",logId:"oak-logs",requiredLevel:15,xp:188,image:"assets/woodcutting/trees/oak-tree.png"},
  {id:"willow",name:"Willow tree",logId:"willow-logs",requiredLevel:30,xp:338,image:"assets/woodcutting/trees/willow-tree.png"},
  {id:"teak",name:"Teak tree",logId:"teak-logs",requiredLevel:35,xp:425,image:"assets/woodcutting/trees/teak-tree.png"},
  {id:"maple",name:"Maple tree",logId:"maple-logs",requiredLevel:45,xp:500,image:"assets/woodcutting/trees/maple-tree.png"},
  {id:"mahogany",name:"Mahogany tree",logId:"mahogany-logs",requiredLevel:50,xp:625,image:"assets/woodcutting/trees/mahogany-tree.png"},
  {id:"yew",name:"Yew tree",logId:"yew-logs",requiredLevel:60,xp:875,image:"assets/woodcutting/trees/yew-tree.png"},
  {id:"magic",name:"Magic tree",logId:"magic-logs",requiredLevel:75,xp:1250,image:"assets/woodcutting/trees/magic-tree.png"},
  {id:"ancient",name:"Ancient tree",logId:"ancient-logs",requiredLevel:85,xp:1750,image:"assets/woodcutting/trees/ancient-tree.png"},
  {id:"celestial",name:"Celestial tree",logId:"celestial-logs",requiredLevel:95,xp:2500,image:"assets/woodcutting/trees/celestial-tree.png"},
];

export const WOODCUTTING_TREE_BY_ID = Object.fromEntries(WOODCUTTING_TREES.map(tree => [tree.id,tree])) as Record<TreeSpecies,WoodcuttingTreeDefinition>;
export const LOG_ITEM_IDS = WOODCUTTING_TREES.map(tree => tree.logId) as LogId[];
