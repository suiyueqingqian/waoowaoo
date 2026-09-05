import { z } from 'zod'
import { ASPECT_RATIO_CONFIGS } from '@/lib/constants'
import { resolveAssetImageKindForSchemaId } from '@/lib/asset-generation'
import type { WorkspaceResourceJsonObject, WorkspaceResourceJsonValue, WorkspaceResourceMediaType } from './contracts'
import { workspaceResourceParentPath } from './contracts'
import {
  imageGenerationItemSchema,
  videoGenerationItemSchema,
} from './generation-request'
import { workspaceResourceDisplayName } from './path'
import {
  type WorkspaceResourceRegenerationOperationId,
  type WorkspaceResourceRegenerationReferenceChannel,
} from './regeneration'
import { WORKSPACE_RESOURCE_GENERATION_SCHEMA_IDS_BY_MEDIA } from './schema-registry'

export interface WorkspaceResourceRegenerationSource {
  readonly resourceId: string
  readonly workspacePath: string
  readonly mediaType: WorkspaceResourceMediaType | null
  readonly schemaId: string
  readonly status: string
  readonly prompt: string | null
  readonly modelKey: string | null
  readonly generationOptions: WorkspaceResourceJsonValue | null
  readonly inputs: readonly {
    readonly resourceId: string
    readonly contentVersion: number
    readonly role: string
    readonly mediaType: WorkspaceResourceMediaType
  }[]
  /** The frozen Task payload of the last generation attempt, when one exists. */
  readonly taskPayload: unknown
}

export interface WorkspaceResourceRegenerationAction {
  readonly operationId: WorkspaceResourceRegenerationOperationId
  readonly input: WorkspaceResourceJsonObject
}

const frozenVideoDurationSchema = z.object({
  durationSeconds: z.number().int().positive(),
}).loose()

function isJsonObject(value: WorkspaceResourceJsonValue | null | undefined): value is WorkspaceResourceJsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function frozenString(options: WorkspaceResourceJsonObject | null, key: string): string | undefined {
  const value = options?.[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function frozenBoolean(options: WorkspaceResourceJsonObject | null, key: string): boolean | undefined {
  const value = options?.[key]
  return typeof value === 'boolean' ? value : undefined
}

function referenceChannel(mediaType: WorkspaceResourceMediaType): WorkspaceResourceRegenerationReferenceChannel {
  return mediaType === 'text' ? 'context' : mediaType
}

/**
 * Projects the exact "run again" request for a generated image or video: the
 * frozen prompt, frame ratio, provider options, references and duration of
 * the Resource, expressed in the public batch schema of the same Operation
 * that produced it. Returns null whenever the Resource cannot be re-run
 * through that Operation (uploads, pending Resources, retired schemas,
 * missing frozen facts), so the Canvas never offers an action the server
 * would reject.
 */
export function projectWorkspaceResourceRegenerationAction(
  source: WorkspaceResourceRegenerationSource,
): WorkspaceResourceRegenerationAction | null {
  const mediaType = source.mediaType
  if (mediaType !== 'image' && mediaType !== 'video') return null
  if (source.status === 'pending') return null
  const prompt = source.prompt?.trim()
  if (!prompt || !source.modelKey?.trim()) return null
  const mintable: readonly string[] = WORKSPACE_RESOURCE_GENERATION_SCHEMA_IDS_BY_MEDIA[mediaType]
  if (!mintable.includes(source.schemaId)) return null
  const options = isJsonObject(source.generationOptions) ? source.generationOptions : null
  const frozenAspectRatio = frozenString(options, 'aspectRatio')
  const aspectRatio = frozenAspectRatio && Object.prototype.hasOwnProperty.call(ASPECT_RATIO_CONFIGS, frozenAspectRatio)
    ? frozenAspectRatio
    : undefined
  const references = source.inputs.map((input) => ({
    resourceId: input.resourceId,
    contentVersion: input.contentVersion,
    role: input.role,
    channel: referenceChannel(input.mediaType),
  }))
  const common = {
    itemId: source.resourceId,
    name: workspaceResourceDisplayName({ workspacePath: source.workspacePath, resourceId: source.resourceId }),
    folderPath: workspaceResourceParentPath(source.workspacePath),
    count: 1,
    schemaId: source.schemaId,
    prompt,
    references,
  }
  if (mediaType === 'image') {
    const assetKind = resolveAssetImageKindForSchemaId(source.schemaId)
    const parsed = imageGenerationItemSchema.safeParse({
      ...common,
      mediaType: 'image',
      assetKind,
      options: {
        ...(assetKind ? {} : aspectRatio ? { aspectRatio } : {}),
        ...(frozenString(options, 'resolution') ? { resolution: frozenString(options, 'resolution') } : {}),
        ...(frozenString(options, 'quality') ? { quality: frozenString(options, 'quality') } : {}),
      },
    })
    if (!parsed.success) return null
    return {
      operationId: 'create_image',
      input: { request: { kind: 'new', items: [parsed.data as unknown as WorkspaceResourceJsonValue] } },
    }
  }
  const frozenDuration = frozenVideoDurationSchema.safeParse(source.taskPayload)
  if (!frozenDuration.success) return null
  const parsed = videoGenerationItemSchema.safeParse({
    ...common,
    mediaType: 'video',
    durationSeconds: frozenDuration.data.durationSeconds,
    options: {
      ...(aspectRatio ? { aspectRatio } : {}),
      ...(frozenString(options, 'resolution') ? { resolution: frozenString(options, 'resolution') } : {}),
      ...(frozenBoolean(options, 'generateAudio') !== undefined
        ? { generateAudio: frozenBoolean(options, 'generateAudio') }
        : {}),
    },
  })
  if (!parsed.success) return null
  return {
    operationId: 'create_video',
    input: { request: { kind: 'new', items: [parsed.data as unknown as WorkspaceResourceJsonValue] } },
  }
}
