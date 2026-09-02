export type SkillId = "woodcutting";

export type SkillDefinition = {
  id:SkillId;
  name:string;
  description:string;
  maxLevel:number;
  xpMultiplier:number;
  xpPerAction:number;
};
