import { createHash } from 'node:crypto'
import { z } from 'zod'
import sharp from 'sharp'
import { ApiError } from '@/lib/api-errors'
import {
  buildUserUploadResourceId,
  buildUserUploadStorageKey,
  resolveUserUploadAcceptedMedia,
  userUploadSchemaIdForMediaType,
} from '@/lib/workspace-resource/upload-contract'
import {
  assertFileSizeWithinLimit,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_MULTIPART_VIDEO_UPLOAD_REQUEST_BYTES,
  MAX_VIDEO_BYTES,
  readFormDataWithLimit,
} from '@/lib/http/body-limits'
import { detectMimeFromBuffer } from '@/lib/media/outbound-image'
import { probeVideoBufferFacts } from '@/lib/media/probe-video'
import { probeMediaBufferDurationMs } from '@/lib/media/probe-duration'
import { ensureMediaObjectFromStorageKey } from '@/lib/media/service'
import { defineOperation } from '@/lib/operations/define-operation'
import {
  requireProjectAgentOperationRequest,
  type ProjectAgentOperationRegistryDraft,
} from '@/lib/operations/types'
import { prisma } from '@/lib/prisma'
import { buildProjectAssistantAttachmentToken } from '@/lib/project-agent/media-attachments/attachment-token'
import { deleteObject, uploadObject } from '@/lib/storage'

type UploadFileLike = {
  name: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

function isFileLike(value: unknown): value is UploadFileLike {
  if (!value || typeof value !== 'object') return false
  const file = value as Partial<UploadFileLike>
  return typeof file.name === 'string' && typeof file.size === 'number'
    && typeof file.arrayBuffer === 'function'
}

const USER_UPLOAD_MAX_BYTES: Readonly<Record<'image' | 'audio' | 'video', number>> = {
  image: MAX_IMAGE_BYTES,
  audio: MAX_AUDIO_BYTES,
  video: MAX_VIDEO_BYTES,
}

const preparedUserUploadSchema = z.object({
  mediaType: z.enum(['image', 'audio', 'video']),
  schemaId: z.string().min(1),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  durationMs: z.number().int().positive().nullable(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  fileName: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
}).strict()

type PreparedUserUpload = z.infer<typeof preparedUserUploadSchema>

const uploadMediaOutputSchema = z.object({
  success: z.literal(true),
  attachment: z.object({
    resourceId: z.string().min(1),
    attachmentToken: z.string().min(1),
    mediaType: z.enum(['image', 'audio', 'video']),
    name: z.string().min(1),
  }).strict(),
}).strict()

const DEFAULT_UPLOAD_NAME: Readonly<Record<'image' | 'audio' | 'video', string>> = {
  image: 'Uploaded image',
  audio: 'Uploaded audio',
  video: 'Uploaded video',
}

function normalizeUploadName(rawName: unknown, fileName: string, mediaType: 'image' | 'audio' | 'video'): string {
  const explicit = typeof rawName === 'string' ? rawName.trim() : ''
  if (explicit) return explicit.slice(0, 200)
  const fromFile = fileName.replace(/\.[a-zA-Z0-9]{1,12}$/, '').trim()
  if (fromFile) return fromFile.slice(0, 200)
  return DEFAULT_UPLOAD_NAME[mediaType]
}

async function normalizeUploadImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ readonly stored: Buffer; readonly width: number | null; readonly height: number | null }> {
  // Re-encoding through sharp both sanitizes hostile payloads and strips
  // metadata; auto-rotation bakes EXIF orientation into the pixels so every
  // downstream consumer sees the image the way the user saw it.
  const pipeline = sharp(buffer).rotate()
  const stored = mimeType === 'image/png'
    ? await pipeline.png().toBuffer()
    : mimeType === 'image/webp'
      ? await pipeline.webp({ quality: 90 }).toBuffer()
      : await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer()
  const metadata = await sharp(stored).metadata()
  return {
    stored,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  }
}

async function prepareUserMediaUpload(request: Request): Promise<PreparedUserUpload> {
  // The multipart envelope is bounded by the largest accepted type; the exact
  // per-type limit is enforced once the bytes have been sniffed.
  const formData = await readFormDataWithLimit(
    request,
    MAX_MULTIPART_VIDEO_UPLOAD_REQUEST_BYTES,
    'project media upload',
  )
  const file = formData.get('file')
  if (!isFileLike(file)) {
    throw new ApiError('INVALID_PARAMS', { code: 'UPLOAD_FILE_REQUIRED', field: 'file' })
  }
  assertFileSizeWithinLimit(file, MAX_VIDEO_BYTES, 'project media upload')

  const buffer = Buffer.from(await file.arrayBuffer())
  const accepted = resolveUserUploadAcceptedMedia(detectMimeFromBuffer(buffer))
  if (!accepted) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'UPLOAD_MEDIA_TYPE_UNSUPPORTED',
      field: 'file',
      message: 'only PNG, JPEG, WebP images, MP3, WAV, OGG audio and MP4, WebM video uploads are supported',
    })
  }
  const maxBytes = USER_UPLOAD_MAX_BYTES[accepted.mediaType]
  if (buffer.byteLength > maxBytes) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'PAYLOAD_TOO_LARGE',
      field: 'file',
      message: `project media upload exceeds the ${maxBytes} byte limit`,
    })
  }

  const normalized = accepted.mediaType === 'image'
    ? { ...await normalizeUploadImage(buffer, accepted.mimeType), durationMs: null }
    : accepted.mediaType === 'video'
      ? {
          stored: buffer,
          ...await probeVideoBufferFacts({
            buffer,
            extension: accepted.extension,
            stage: 'project_media_upload_probe_video',
          }),
        }
      : {
          stored: buffer, width: null, height: null,
          durationMs: await probeMediaBufferDurationMs({
            buffer, extension: accepted.extension, stage: 'project_media_upload_probe_audio',
          }),
        }
  if (normalized.stored.byteLength > maxBytes) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'PAYLOAD_TOO_LARGE',
      field: 'file',
      message: `project media upload exceeds the ${maxBytes} byte limit`,
    })
  }

  const sha256 = createHash('sha256').update(normalized.stored).digest('hex')
  const storageKey = buildUserUploadStorageKey({ sha256, extension: accepted.extension })
  const fileName = (file.name.trim() || 'upload').slice(0, 200)
  const prepared: PreparedUserUpload = {
    mediaType: accepted.mediaType,
    schemaId: userUploadSchemaIdForMediaType(accepted.mediaType),
    storageKey,
    mimeType: accepted.mimeType,
    sizeBytes: normalized.stored.byteLength,
    width: normalized.width,
    height: normalized.height,
    durationMs: normalized.durationMs,
    sha256,
    fileName,
    name: normalizeUploadName(formData.get('name'), fileName, accepted.mediaType),
  }
  // Content-addressed key: identical bytes overwrite an identical object, so
  // this upload never orphans a second copy and retries are idempotent.
  await uploadObject(normalized.stored, storageKey, accepted.mimeType)
  return prepared
}

const resourceAttachmentInputSchema = z.object({
  resourceId: z.string().min(1).max(64),
}).strict()

export function createMediaUploadApiOperations(): ProjectAgentOperationRegistryDraft {
  return {
    api_project_resource_attachment: defineOperation({
      id: 'api_project_resource_attachment',
      summary: 'API-only: Issue a signed chat-attachment receipt for an existing project image Resource so the selected canvas image can enter the model input protocol. Read-only: verifies ownership, media identity and the upload media whitelist, then signs the same attachment token the upload flow issues. No Resource or MediaObject is written.',
      intent: 'query',
      effects: {
        writes: false,
        billable: false,
        destructive: false,
        overwrite: false,
        bulk: false,
        externalSideEffects: false,
        longRunning: false,
      },
      inputSchema: resourceAttachmentInputSchema,
      outputSchema: uploadMediaOutputSchema,
      execute: async (ctx, input) => {
        const resource = await prisma.workspaceResource.findUnique({
          where: { id: input.resourceId },
          select: {
            id: true,
            projectId: true,
            userId: true,
            deletedAt: true,
            mediaType: true,
            name: true,
            status: true,
            currentVersion: true,
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
              select: {
                version: true,
                media: {
                  select: {
                    publicId: true,
                    sha256: true,
                    mimeType: true,
                  },
                },
              },
            },
          },
        })
        if (!resource || resource.projectId !== ctx.projectId || resource.userId !== ctx.userId || resource.deletedAt) {
          throw new ApiError('NOT_FOUND', {
            code: 'WORKSPACE_RESOURCE_NOT_FOUND',
            field: 'resourceId',
          })
        }
        const current = resource.versions[0]
        if (
          resource.mediaType !== 'image'
          || resource.status !== 'ready'
          || !current
          || current.version !== resource.currentVersion
        ) {
          throw new ApiError('INVALID_PARAMS', {
            code: 'RESOURCE_ATTACHMENT_NOT_ELIGIBLE',
            field: 'resourceId',
            message: 'only ready image Resources with stored media can be attached to the assistant',
          })
        }
        const accepted = resolveUserUploadAcceptedMedia(current.media.mimeType)
        if (!accepted || accepted.mediaType !== 'image' || !current.media.sha256) {
          throw new ApiError('INVALID_PARAMS', {
            code: 'RESOURCE_ATTACHMENT_MEDIA_UNSUPPORTED',
            field: 'resourceId',
            message: 'the stored media format cannot enter the attachment protocol',
          })
        }
        const name = resource.name.trim().slice(0, 200) || 'Image'
        const attachmentToken = buildProjectAssistantAttachmentToken({
          v: 1,
          publicId: current.media.publicId,
          resourceId: resource.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          mediaType: 'image',
          fileName: `${name.slice(0, 190)}.${accepted.extension}`,
          name,
          sha256: current.media.sha256.toLowerCase(),
        })
        return uploadMediaOutputSchema.parse({
          success: true,
          attachment: {
            resourceId: resource.id,
            attachmentToken,
            mediaType: 'image',
            name,
          },
        })
      },
    }),
    api_project_upload_media: defineOperation({
      id: 'api_project_upload_media',
      summary: 'API-only: Register one user-uploaded image, audio or video file (sniffed, sanitized, content-addressed, MediaObject-registered) as an upload receipt and return its signed registration token. No WorkspaceResource is created here; register_uploaded_media materializes it on demand.',
      intent: 'act',
      effects: {
        writes: true,
        // Only bytes and the shared MediaObject registration are written; no
        // Resource exists until register_uploaded_media materializes one.
        workspaceResourceImpact: 'none',
        billable: false,
        destructive: false,
        overwrite: false,
        bulk: false,
        externalSideEffects: true,
        longRunning: false,
      },
      resourceContract: {
        kind: 'none',
        reason: 'registers a chat attachment only; register_uploaded_media is the sole materialization entry for upload Resources',
      },
      confirmation: { kind: 'none', required: false },
      inputSchema: z.object({}).passthrough(),
      outputSchema: uploadMediaOutputSchema,
      prepareTransaction: async (ctx) => {
        return await prepareUserMediaUpload(
          requireProjectAgentOperationRequest(ctx),
        )
      },
      executeInTransaction: async (ctx, _input, transaction, preparedValue) => {
        const prepared = preparedUserUploadSchema.parse(preparedValue)
        const media = await ensureMediaObjectFromStorageKey(prepared.storageKey, {
          sha256: prepared.sha256,
          mimeType: prepared.mimeType,
          sizeBytes: prepared.sizeBytes,
          width: prepared.width,
          height: prepared.height,
          durationMs: prepared.durationMs,
        }, transaction)
        const resourceId = buildUserUploadResourceId({
          projectId: ctx.projectId,
          sha256: prepared.sha256,
        })
        const attachmentToken = buildProjectAssistantAttachmentToken({
          v: 1,
          publicId: media.publicId,
          resourceId,
          userId: ctx.userId,
          projectId: ctx.projectId,
          mediaType: prepared.mediaType,
          fileName: prepared.fileName,
          name: prepared.name,
          sha256: prepared.sha256,
        })
        return uploadMediaOutputSchema.parse({
          success: true,
          attachment: {
            resourceId,
            attachmentToken,
            mediaType: prepared.mediaType,
            name: prepared.name,
          },
        })
      },
      compensateTransactionFailure: async (_ctx, _input, preparedValue) => {
        const prepared = preparedUserUploadSchema.parse(preparedValue)
        // The content-addressed key may be shared with an earlier upload of the
        // same bytes (including another user's), so the object is only removed
        // when no committed MediaObject row claims it; a registered object is
        // owned by the media lifecycle, never by this failed invocation.
        const committed = await prisma.mediaObject.findUnique({
          where: { storageKey: prepared.storageKey },
          select: { id: true },
        })
        if (committed) return
        await deleteObject(prepared.storageKey)
      },
    }),
  }
}
