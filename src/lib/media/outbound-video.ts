import { MAX_VIDEO_BYTES } from '@/lib/http/body-limits'
import {
  projectOwnedMediaForGeneration,
  resolveOwnedMediaForGeneration,
} from '@/lib/media/outbound-owned-media'

const SUPPORTED_PROVIDER_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

export const OUTBOUND_VIDEO_POLICY = {
  maxBytes: MAX_VIDEO_BYTES,
  label: 'owned outbound video reference',
  supportedMimeTypes: SUPPORTED_PROVIDER_VIDEO_MIME_TYPES,
} as const

export async function resolveOwnedVideoForGeneration(
  input: string,
  userId: string,
  transport: 'inline-data-url' | 'public-https',
): Promise<string> {
  const media = await resolveOwnedMediaForGeneration(input, userId, OUTBOUND_VIDEO_POLICY)
  return await projectOwnedMediaForGeneration(media, {
    mediaInput: input,
    label: 'owned outbound video reference',
    transport,
  })
}
