import { MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '@/lib/http/body-size-constants'
import type { ProjectAssistantMediaAttachmentValidationCode } from '@/lib/project-agent/media-attachments/client'

/**
 * Browser-side routing for Canvas uploads. The server re-sniffs bytes and is
 * the only acceptance authority; this list just decides which files the
 * picker and drop handlers forward. It is wider than the chat attachment
 * list because the Canvas materializes uploads into Resources directly,
 * whereas a chat attachment must be viewable by the model.
 */
const WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION = {
  png: { mimeType: 'image/png', mediaType: 'image' },
  jpg: { mimeType: 'image/jpeg', mediaType: 'image' },
  jpeg: { mimeType: 'image/jpeg', mediaType: 'image' },
  webp: { mimeType: 'image/webp', mediaType: 'image' },
  mp3: { mimeType: 'audio/mpeg', mediaType: 'audio' },
  wav: { mimeType: 'audio/wav', mediaType: 'audio' },
  ogg: { mimeType: 'audio/ogg', mediaType: 'audio' },
  mp4: { mimeType: 'video/mp4', mediaType: 'video' },
  webm: { mimeType: 'video/webm', mediaType: 'video' },
} as const satisfies Record<string, { readonly mimeType: string; readonly mediaType: 'image' | 'audio' | 'video' }>

type WorkspaceUploadMediaType = (typeof WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION)[keyof typeof WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION]['mediaType']

const MAX_BYTES_BY_MEDIA_TYPE: Readonly<Record<WorkspaceUploadMediaType, number>> = {
  image: MAX_IMAGE_BYTES,
  audio: MAX_AUDIO_BYTES,
  video: MAX_VIDEO_BYTES,
}

export const WORKSPACE_UPLOAD_ACCEPT = [
  ...Object.keys(WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION).map((extension) => `.${extension}`),
  ...new Set(Object.values(WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION).map((entry) => entry.mimeType)),
].join(',')

export function workspaceUploadMediaType(file: File): WorkspaceUploadMediaType | null {
  const mimeType = file.type.toLowerCase()
  const byMime = Object.values(WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION).find((entry) => entry.mimeType === mimeType)
  if (byMime) return byMime.mediaType
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (!extension || !Object.prototype.hasOwnProperty.call(WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION, extension)) return null
  return WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION[extension as keyof typeof WORKSPACE_UPLOAD_MEDIA_BY_EXTENSION].mediaType
}

export function validateWorkspaceUploadFile(file: File): ProjectAssistantMediaAttachmentValidationCode | null {
  if (file.size <= 0) return 'UPLOAD_FILE_EMPTY'
  const mediaType = workspaceUploadMediaType(file)
  if (!mediaType) return 'PROJECT_ASSISTANT_MEDIA_ATTACHMENT_UNSUPPORTED_TYPE'
  if (file.size > MAX_BYTES_BY_MEDIA_TYPE[mediaType]) return 'PROJECT_ASSISTANT_MEDIA_ATTACHMENT_SIZE_LIMIT_EXCEEDED'
  return null
}
