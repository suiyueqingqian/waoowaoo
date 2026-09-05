import type { AppIconName } from '@/components/ui/icons'
import type { UnifiedModelType } from '@/lib/ai-registry/types'

interface ModelSlotPresentation {
  readonly icon: AppIconName
  /** Plain category name, used for provider model sections. */
  readonly typeLabel: string
  /** Slot heading in the picker cards. */
  readonly slotTitle: string
}

/** One presentation registry for every model slot, exhaustive by construction. */
export const MODEL_SLOT_PRESENTATION = {
  llm: { icon: 'brain', typeLabel: 'typeText', slotTitle: 'slotTitle.llm' },
  image: { icon: 'image', typeLabel: 'typeImage', slotTitle: 'slotTitle.image' },
  video: { icon: 'video', typeLabel: 'typeVideo', slotTitle: 'slotTitle.video' },
  music: { icon: 'audioWave', typeLabel: 'typeMusic', slotTitle: 'slotTitle.music' },
  voice: { icon: 'mic', typeLabel: 'typeVoice', slotTitle: 'slotTitle.voice' },
} as const satisfies Record<UnifiedModelType, ModelSlotPresentation>
