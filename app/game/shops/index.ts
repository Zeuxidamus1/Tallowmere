import { ARMOR, AXES } from "../items";
import type { GearId, ItemId, StoreId } from "../types";

export type CityBuildingDefinition = {
  id:"bank"|StoreId;
  name:string;
  shortName:string;
  icon:string;
  x:number;
  y:number;
  doorX:number;
  doorY:number;
};

export type StoreDefinition = CityBuildingDefinition & {
  id:StoreId;
  keeper:string;
  description:string;
  stock:GearId[];
};

export const CITY_BANK:CityBuildingDefinition = {
  id:"bank", name:"The Bank of Tallowmere", shortName:"Bank", icon:"●",
  x:22, y:24, doorX:23, doorY:40,
};

export const STORES:Record<StoreId,StoreDefinition> = {
  general:{
    id:"general", name:"Tallowmere General Store", shortName:"General Store", keeper:"Mara Vale",
    description:"Mara buys every tradeable item at its listed gold value.", icon:"¤",
    x:51, y:24, doorX:51, doorY:39, stock:[],
  },
  weapons:{
    id:"weapons", name:"The Iron Lantern", shortName:"Weapons", keeper:"Bram Ironhand",
    description:"Axes and future weapons are stocked by the city smith.", icon:"⚔",
    x:20, y:72, doorX:22, doorY:81, stock:AXES.map(item => item.id),
  },
  armor:{
    id:"armor", name:"The Green Aegis", shortName:"Armor", keeper:"Edda Thorn",
    description:"Protective equipment for travelers heading beyond the walls.", icon:"◆",
    x:76, y:72, doorX:76, doorY:82, stock:ARMOR.map(item => item.id),
  },
  skills:{
    id:"skills", name:"Guild of Trades", shortName:"Skills", keeper:"Archivist Oren",
    description:"Training knowledge and specialist supplies for every city skill.", icon:"✦",
    x:80, y:30, doorX:79, doorY:45, stock:[],
  },
};

export const STORE_ORDER:StoreId[] = ["general","weapons","armor","skills"];

export function storeAcceptsItem(store:StoreId,item:ItemId) {
  if (store==="general") return true;
  if (store==="weapons") return AXES.some(axe => axe.id===item);
  if (store==="armor") return ARMOR.some(piece => piece.id===item);
  return false;
}
