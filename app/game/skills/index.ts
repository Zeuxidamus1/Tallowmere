import type { SkillDefinition, SkillId } from "./types";
import { WOODCUTTING } from "./woodcutting";

export * from "./types";
export * from "./woodcutting";

export const SKILLS:Record<SkillId,SkillDefinition> = {
  woodcutting:WOODCUTTING,
};
