// API contract, not the marketing capability page:
// https://docs.volcengine.com/docs/82379/1541523 (2026-08-28)
export const ARK_IMAGE_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '9:21'] as const

type ImageRatio = (typeof ARK_IMAGE_RATIOS)[number]
type ImageSizes = Readonly<Record<ImageRatio, string>>

function sizes(square: number, landscape: readonly [string, string, string, string]): ImageSizes {
  const [wide, standard, photo, cinema] = landscape
  const transpose = (size: string) => size.split('x').reverse().join('x')
  return {
    '1:1': `${square}x${square}`,
    '16:9': wide, '9:16': transpose(wide),
    '4:3': standard, '3:4': transpose(standard),
    '3:2': photo, '2:3': transpose(photo),
    '21:9': cinema, '9:21': transpose(cinema),
  }
}

export interface ArkImageModelSpec {
  readonly modelId: string
  readonly name: string
  readonly sizes: Readonly<Record<string, ImageSizes>>
  readonly maxReferenceImages: number
  readonly sequentialImageGeneration: 'omit' | 'disabled'
}

// These explicit WxH requests use the API's custom-size mode. The transposed
// 9:21 sizes meet its pixel/ratio bounds; they are not a claimed native enum.
export const ARK_IMAGE_MODELS: readonly ArkImageModelSpec[] = [
  {
    modelId: 'doubao-seedream-5-0-pro-260628',
    name: 'Seedream 5.0 Pro',
    maxReferenceImages: 10,
    sequentialImageGeneration: 'omit',
    sizes: {
      '1K': sizes(1024, ['1424x800', '1152x864', '1248x832', '1568x672']),
      '1.5K': sizes(1536, ['2048x1152', '1792x1344', '1872x1248', '2352x1008']),
      '2K': sizes(2048, ['2816x1584', '2368x1776', '2496x1664', '3136x1344']),
    },
  },
  {
    modelId: 'doubao-seedream-5-0-260128',
    name: 'Seedream 5.0 Lite',
    maxReferenceImages: 14,
    sequentialImageGeneration: 'disabled',
    sizes: {
      '2K': sizes(2048, ['2848x1600', '2304x1728', '2496x1664', '3136x1344']),
      '3K': sizes(3072, ['4096x2304', '3456x2592', '3744x2496', '4704x2016']),
      '4K': sizes(4096, ['5504x3040', '4704x3520', '4992x3328', '6240x2656']),
    },
  },
]

export function requireArkImageModelSpec(modelId: string): ArkImageModelSpec {
  const spec = ARK_IMAGE_MODELS.find((model) => model.modelId === modelId)
  if (!spec) throw new Error(`ARK_IMAGE_MODEL_UNSUPPORTED:${modelId}`)
  return spec
}
