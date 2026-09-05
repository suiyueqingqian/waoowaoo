import { z } from 'zod'
import { VIDEO_RESOLUTIONS } from '@/lib/constants'
import { generationAspectRatioSchema } from './generation-request'
import { taskRuntimePayloadEnvelopeShape } from '@/lib/task/progress-payload'
import { workspaceResourceGenerationOptionsSchema } from './generation-contract'
import {
  workspaceResourceLifecycleProjectionSchema,
} from './task-runtime-envelope'

const videoMergeInputRefSchema = z.object({
  resourceId: z.string().trim().min(1),
  contentVersion: z.number().int().positive(),
  workspacePath: z.string().trim().min(1).max(512),
  role: z.enum(['source_video', 'bgm_audio']),
  position: z.number().int().min(0),
}).strict()

export const videoMergeTrimSchema = z.object({
  startSeconds: z.number().finite().nonnegative(),
  endSeconds: z.number().finite().positive(),
}).strict().refine((value) => value.endSeconds > value.startSeconds, {
  message: 'endSeconds must be greater than startSeconds.',
})

export const videoMergeOutputSchema = z.object({
  aspectRatio: generationAspectRatioSchema,
  resolution: z.enum(VIDEO_RESOLUTIONS.map((resolution) => resolution.value) as [string, ...string[]]),
  audioMode: z.enum(['preserve', 'mute']),
}).strict().describe('Explicit output format. Resolution is the short edge; preserve keeps source audio and music cues, mute removes all audio. Output uses 30 fps with letterboxing and the requested display aspect ratio.')

export const VIDEO_MERGE_FPS = 30

export const videoMergeEditSchema = z.object({
  clips: z.array(z.object({
    inputPosition: z.number().int().nonnegative(),
    startFrame: z.number().int().nonnegative(),
    frameCount: z.number().int().positive(),
  }).strict()).min(1).max(50),
  width: z.number().int().positive().multipleOf(2),
  height: z.number().int().positive().multipleOf(2),
  aspectRatio: generationAspectRatioSchema,
  audioMode: z.enum(['preserve', 'mute']),
}).strict()

const videoMergeInputsSchema = z.array(videoMergeInputRefSchema).min(1).max(51)
  .refine(
    (inputs) => {
      const sourceCount = inputs.filter((input) => input.role === 'source_video').length
      return sourceCount >= 1 && sourceCount <= 50
    },
    { message: 'VIDEO_MERGE_SOURCE_VIDEO_COUNT_INVALID' },
  )

export const workspaceResourceVideoMergeTaskPayloadSchema = z.object({
  lifecycleProjection: workspaceResourceLifecycleProjectionSchema,
  resource: z.object({
    resourceId: z.string().trim().min(1),
    mediaType: z.literal('video'),
    schemaId: z.literal('generic.video'),
    prompt: z.null(),
    modelKey: z.null(),
    inputHash: z.string().length(64),
    inputs: videoMergeInputsSchema,
    generationOptions: workspaceResourceGenerationOptionsSchema,
    edit: videoMergeEditSchema,
    musicCues: z.array(z.object({
      inputPosition: z.number().int().nonnegative(),
      startMs: z.number().int().nonnegative(),
      durationMs: z.number().int().positive(),
      fadeInMs: z.number().int().nonnegative(),
      fadeOutMs: z.number().int().nonnegative(),
      gainDb: z.number().finite().min(-60).max(12),
    }).strict().superRefine((cue, context) => {
      if (cue.fadeInMs > cue.durationMs) {
        context.addIssue({ code: 'custom', path: ['fadeInMs'], message: 'fadeInMs exceeds cue duration.' })
      }
      if (cue.fadeOutMs > cue.durationMs) {
        context.addIssue({ code: 'custom', path: ['fadeOutMs'], message: 'fadeOutMs exceeds cue duration.' })
      }
    })).max(50),
    toolCallId: z.string().trim().min(1).nullable(),
  }).strict().superRefine((resource, context) => {
    const bgmPositions = new Set(
      resource.inputs
        .filter((reference) => reference.role === 'bgm_audio')
        .map((reference) => reference.position),
    )
    const cuePositions = resource.musicCues.map((cue) => cue.inputPosition)
    if (
      cuePositions.length !== bgmPositions.size
      || new Set(cuePositions).size !== cuePositions.length
      || cuePositions.some((position) => !bgmPositions.has(position))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['musicCues'],
        message: 'Every bgm_audio input must have exactly one frozen cue placement.',
      })
    }
    const sourceCount = resource.inputs.filter((reference) => reference.role === 'source_video').length
    const sourcePositions = new Set(resource.inputs.filter((reference) => reference.role === 'source_video').map((reference) => reference.position))
    if (resource.edit.clips.length !== sourceCount || new Set(resource.edit.clips.map((clip) => clip.inputPosition)).size !== sourceCount || resource.edit.clips.some((clip) => !sourcePositions.has(clip.inputPosition))) {
      context.addIssue({ code: 'custom', path: ['edit', 'clips'], message: 'Every source video requires exactly one frozen edit.' })
    }
    if (resource.edit.audioMode === 'mute' && resource.musicCues.length > 0) {
      context.addIssue({ code: 'custom', path: ['edit', 'audioMode'], message: 'Mute cannot be combined with music cues.' })
    }
    if (resource.musicCues.length > 0 && sourceCount !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['musicCues'],
        message: 'Music cues can only be placed onto one already-merged source video.',
      })
    }
  }),
}).strict()

const workspaceResourceVideoMergeTaskEnvelopeSchema = workspaceResourceVideoMergeTaskPayloadSchema.extend({
  ...taskRuntimePayloadEnvelopeShape,
}).strict()

export type WorkspaceResourceVideoMergeTaskPayload = z.infer<
  typeof workspaceResourceVideoMergeTaskPayloadSchema
>

export function parseWorkspaceResourceVideoMergeTaskPayload(
  value: unknown,
): WorkspaceResourceVideoMergeTaskPayload {
  const parsed = workspaceResourceVideoMergeTaskEnvelopeSchema.parse(value)
  return workspaceResourceVideoMergeTaskPayloadSchema.parse({
    lifecycleProjection: parsed.lifecycleProjection,
    resource: parsed.resource,
  })
}
