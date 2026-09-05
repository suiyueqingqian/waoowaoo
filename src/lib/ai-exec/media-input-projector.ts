import { getDeploymentConfig } from '@/lib/deployment/config'
import { resolveOwnedAudioForGeneration } from '@/lib/media/outbound-audio'
import { resolveOwnedImageForGeneration } from '@/lib/media/outbound-image'
import { resolveOwnedVideoForGeneration } from '@/lib/media/outbound-video'

async function projectImageArray(values: readonly string[], userId: string): Promise<string[]> {
  const transport = getDeploymentConfig().providerMediaInputTransport
  return await Promise.all(values.map(async (value) => (
    await resolveOwnedImageForGeneration(value, userId, transport)
  )))
}

async function projectAudioArray(values: readonly string[], userId: string): Promise<string[]> {
  const transport = getDeploymentConfig().providerMediaInputTransport
  return await Promise.all(values.map(async (value) => (
    await resolveOwnedAudioForGeneration(value, userId, transport)
  )))
}

async function projectVideoArray(values: readonly string[], userId: string): Promise<string[]> {
  const transport = getDeploymentConfig().providerMediaInputTransport
  return await Promise.all(values.map(async (value) => (
    await resolveOwnedVideoForGeneration(value, userId, transport)
  )))
}

export async function projectImageMediaInputs<T extends {
  readonly referenceImages?: string[]
}>(input: {
  readonly userId: string
  readonly options: T | undefined
}): Promise<T | undefined> {
  if (!input.options?.referenceImages?.length) return input.options
  return {
    ...input.options,
    referenceImages: await projectImageArray(input.options.referenceImages, input.userId),
  }
}

export async function projectVideoMediaInputs<T extends {
  readonly lastFrameImageUrl?: string
  readonly referenceImages?: string[]
  readonly referenceAudios?: string[]
  readonly referenceVideos?: string[]
}>(input: {
  readonly userId: string
  readonly imageUrl: string
  readonly options: T | undefined
}): Promise<{ readonly imageUrl: string; readonly options: T | undefined }> {
  const transport = getDeploymentConfig().providerMediaInputTransport
  const imageUrl = input.imageUrl
    ? await resolveOwnedImageForGeneration(input.imageUrl, input.userId, transport)
    : ''
  if (!input.options) return { imageUrl, options: undefined }

  const options = {
    ...input.options,
    ...(input.options.lastFrameImageUrl
      ? {
          lastFrameImageUrl: await resolveOwnedImageForGeneration(
            input.options.lastFrameImageUrl,
            input.userId,
            transport,
          ),
        }
      : {}),
    ...(input.options.referenceImages?.length
      ? { referenceImages: await projectImageArray(input.options.referenceImages, input.userId) }
      : {}),
    ...(input.options.referenceAudios?.length
      ? { referenceAudios: await projectAudioArray(input.options.referenceAudios, input.userId) }
      : {}),
    ...(input.options.referenceVideos?.length
      ? { referenceVideos: await projectVideoArray(input.options.referenceVideos, input.userId) }
      : {}),
  }
  return { imageUrl, options }
}
