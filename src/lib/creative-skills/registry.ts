import {
  type CreativeSkillDefinition,
  type CreativeSkillId,
} from './types'

function defineSkill(
  definition: Omit<CreativeSkillDefinition, 'entryUri'>,
): CreativeSkillDefinition {
  return {
    ...definition,
    entryUri: `skill://${definition.id}/SKILL.md`,
  }
}

export const CREATIVE_SKILL_REGISTRY: Readonly<Record<CreativeSkillId, CreativeSkillDefinition>> = {
  'creative-core': defineSkill({
    id: 'creative-core',
    version: '1.6.0',
    title: '创作核心',
    summary: '主 Agent 专业创作共用的事实边界、目标忠实性、假设管理、续作状态锚定、源文本时间线纪律、通用时长估算与交付自检。',
    tags: ['core', 'creative', 'reasoning', 'quality', 'duration', 'continuity'],
  }),
  'script-development': defineSkill({
    id: 'script-development',
    version: '6.0.0',
    title: '内容与脚本开发',
    summary: '面向故事、播放量短视频、商业广告与品牌宣传的源文本创作方法：按需求类型选择访谈、方向候选尺子与脚本形态；人物因果、节奏档位、开场与对白纪律；只处理源文本，不登记生产资产。',
    tags: ['script', 'story', 'screenplay', 'commercial', 'promo', 'writing', 'hook', 'pacing'],
  }),
  'creative-direction': defineSkill({
    id: 'creative-direction',
    version: '5.1.0',
    title: '创作方向',
    summary: '把用户意图与必要研究收敛为一份只决定呈现、不改写源文本内容或时间线的六领域方向；声明核心呈现冻结检查点。',
    tags: ['creative-direction', 'style', 'narrative', 'directing', 'editing', 'sound', 'assets'],
  }),
  'asset-development': defineSkill({
    id: 'asset-development',
    version: '5.4.0',
    title: '资产范围与视觉设计',
    summary: '从精确源文本筛选可复用资产，完成稳定设计与最终图片提示词；声明可复用资产类型与生成后评审检查点；生成画幅由服务端资产策略决定。',
    tags: ['asset', 'image', 'character', 'location', 'prop', 'reference', 'candidate'],
  }),
  'video-direction': defineSkill({
    id: 'video-direction',
    version: '4.3.0',
    title: '视频导演与生成设计',
    summary: '以结构化状态接力和物理表演设计完成整片时间线、最少分段装载、最终提示词与接缝自检；声明完整视频作品的规划纪律与交付检查。',
    tags: ['video', 'director', 'prompt', 'editing', 'timeline', 'shot', 'camera', 'continuity', 'audio'],
  }),
  'music-direction': defineSkill({
    id: 'music-direction',
    version: '3.2.0',
    title: '音乐与配乐设计',
    summary: '从内容与真实成片时间线决定配乐窗口，并直接创作 Eleven Music v2 Composition Plan 与精确 cue 合成参数；声明配乐决定检查点。',
    tags: ['music', 'bgm', 'score', 'audio', 'composition-plan', 'timeline'],
  }),
}

export function getCreativeSkillDefinition(skillId: CreativeSkillId): CreativeSkillDefinition {
  const definition = CREATIVE_SKILL_REGISTRY[skillId]
  if (!definition) {
    throw new Error(`CREATIVE_SKILL_NOT_FOUND:${skillId}`)
  }
  return definition
}
