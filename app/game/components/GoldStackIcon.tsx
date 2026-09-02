/* eslint-disable @next/next/no-img-element -- shared public assets also render in the GitHub Pages build */
import { getGoldIcon, getGoldTier } from "../currency";

export function GoldStackIcon({amount,size="small",className=""}:{
  amount:number; size?:"tiny"|"small"|"medium"|"large"; className?:string;
}) {
  const tier = getGoldTier(amount);
  return <img className={`gold-stack-icon gold-stack-icon--${size} gold-stack-icon--${tier} ${className}`.trim()}
    src={getGoldIcon(amount)} alt="" aria-hidden="true" draggable="false"/>;
}
