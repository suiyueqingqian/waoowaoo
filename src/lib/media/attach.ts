import { decodeImageUrlsFromDb } from '@/lib/contracts/image-urls-contract'
import {
  resolveMediaRefFromLegacyValue,
  type MediaClient,
} from './service'
import type { MediaRef } from './types'

async function resolveAppearanceImageArray(
  raw: unknown,
  fieldName: string,
  client?: MediaClient,
): Promise<{ urls: string[]; medias: Array<MediaRef | null> }> {
  const values = raw == null ? [] : decodeImageUrlsFromDb(raw as string, fieldName)
  const refs = await Promise.all(values.map((value) => resolveMediaRefFromLegacyValue(value, client)))
  return {
    urls: values.map((value, index) => refs[index]?.url || value),
    medias: refs,
  }
}

async function attachMediaFieldsToAppearance<T extends Record<string, unknown>>(
  appearance: T,
  client?: MediaClient,
) {
  const imageMedia = await resolveMediaRefFromLegacyValue(appearance.imageUrl, client)
  const previousImageMedia = await resolveMediaRefFromLegacyValue(appearance.previousImageUrl, client)
  const imageResult = await resolveAppearanceImageArray(appearance.imageUrls, 'appearance.imageUrls', client)
  const previousImageResult = await resolveAppearanceImageArray(appearance.previousImageUrls, 'appearance.previousImageUrls', client)

  return {
    ...appearance,
    imageMedia,
    media: imageMedia,
    previousImageMedia,
    imageMedias: imageResult.medias,
    previousImageMedias: previousImageResult.medias,
    imageUrl: imageMedia?.url || appearance.imageUrl || null,
    previousImageUrl: previousImageMedia?.url || appearance.previousImageUrl || null,
    imageUrls: imageResult.urls,
    previousImageUrls: previousImageResult.urls,
  }
}

export async function attachMediaFieldsToGlobalCharacter<T extends Record<string, unknown>>(
  character: T,
  client?: MediaClient,
) {
  const appearances = await Promise.all(
    ((character.appearances as Array<Record<string, unknown>>) || [])
      .map((appearance) => attachMediaFieldsToAppearance(appearance, client)),
  )

  return {
    ...character,
    appearances,
  }
}

export async function attachMediaFieldsToGlobalLocation<T extends Record<string, unknown>>(
  location: T,
  client?: MediaClient,
) {
  const images = await Promise.all(
    ((location.images as Array<Record<string, unknown>>) || []).map(async (img) => {
    const imageMedia = await resolveMediaRefFromLegacyValue(img.imageUrl, client)
    const previousImageMedia = await resolveMediaRefFromLegacyValue(img.previousImageUrl, client)
    return {
      ...img,
      media: imageMedia,
      imageMedia,
      previousImageMedia,
      imageUrl: imageMedia?.url || img.imageUrl || null,
      previousImageUrl: previousImageMedia?.url || img.previousImageUrl || null,
    }
    }),
  )

  return {
    ...location,
    images,
  }
}
