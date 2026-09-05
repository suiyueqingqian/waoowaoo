'use client'

import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useClientErrorMessage } from '@/hooks/useClientErrorMessage'
import { useAttachmentFilePicker } from '@/components/project-assistant/useAttachmentFilePicker'
import { PROJECT_ASSISTANT_TEXT_ATTACHMENT_ACCEPT, PROJECT_ASSISTANT_TEXT_ATTACHMENT_MAX_FILES } from '@/lib/project-agent/text-attachments'
import { uploadProjectAssistantTextAttachment, validateProjectAssistantTextAttachmentFile } from '@/lib/project-agent/text-attachments/client'
import { PROJECT_ASSISTANT_MEDIA_ATTACHMENT_ACCEPT, PROJECT_ASSISTANT_MEDIA_ATTACHMENT_MAX_FILES, type ProjectAssistantMediaAttachment } from '@/lib/project-agent/media-attachments'
import { isProjectAssistantMediaFile, mintProjectAssistantResourceAttachment, uploadProjectAssistantMediaAttachment, validateProjectAssistantMediaAttachmentFile } from '@/lib/project-agent/media-attachments/client'
import type {
  WorkspaceAssistantDraftRequest,
  WorkspaceAssistantDraftSubmitRequest,
  WorkspaceCanvasSelection,
} from '../../canvas/contracts/workspace-canvas-interactions'
import type { WorkspaceAssistantFailureView } from './workspace-assistant-panel-state'
import type { WorkspaceAssistantSendMessageInput } from './useWorkspaceAssistantRuntime'
import { useWorkspaceAssistantComposer } from './useWorkspaceAssistantComposer'
import { WorkspaceAssistantComposer } from './WorkspaceAssistantComposer'

function WorkspaceAssistantComposerControllerImpl({
  projectId, selection, draftRequest, onDraftRequestConsumed, onClearSelection,
  pending, canStopReply, error, sendMessage, onStopReply,
}: {
  readonly projectId: string
  readonly selection: WorkspaceCanvasSelection | null
  readonly draftRequest: WorkspaceAssistantDraftRequest | null
  readonly onDraftRequestConsumed: (requestId: string) => void
  readonly onClearSelection: () => void
  readonly pending: boolean
  readonly canStopReply: boolean
  readonly error: WorkspaceAssistantFailureView | null
  readonly sendMessage: (input: WorkspaceAssistantSendMessageInput) => Promise<void>
  readonly onStopReply: () => Promise<void>
}) {
  const t = useTranslations('assistantAgent')
  const resolveClientError = useClientErrorMessage()
  const panelScopeKey = projectId
  const panelScopeKeyRef = useRef(panelScopeKey)
  useLayoutEffect(() => { panelScopeKeyRef.current = panelScopeKey }, [panelScopeKey])
  const composer = useWorkspaceAssistantComposer(sendMessage, panelScopeKey)
  const { applyDraftRequest } = composer
  const [mediaUploadPending, setMediaUploadPending] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  // A Canvas draft sends through the same authority as the composer: image
  // references become signed attachments first, then one user message with the
  // draft's deterministic source key. Failures surface under the composer and
  // release the draft; nothing is retried implicitly.
  const submitCanvasDraft = async (request: WorkspaceAssistantDraftSubmitRequest): Promise<void> => {
    const submitScopeKey = panelScopeKey
    setAttachmentError(null)
    try {
      const mediaAttachments: ProjectAssistantMediaAttachment[] = []
      for (const reference of request.imageReferences) {
        mediaAttachments.push(await mintProjectAssistantResourceAttachment({
          projectId,
          resourceId: reference.resourceId,
          previewUrl: reference.previewUrl,
        }))
      }
      if (panelScopeKeyRef.current !== submitScopeKey) {
        request.onFailed()
        return
      }
      await sendMessage({
        text: request.text,
        canvasGenerationIntent: request.canvasGenerationIntent,
        attachments: [],
        mediaAttachments,
        sourceKey: request.sourceKey,
        expectedProductionConfigurationVersion: request.expectedProductionConfigurationVersion,
      })
    } catch (error) {
      if (panelScopeKeyRef.current === submitScopeKey) {
        setAttachmentError(resolveClientError(error, t('attachments.mediaUploadFailed')))
      }
      request.onFailed()
    }
  }
  useEffect(() => {
    if (!draftRequest) return
    onDraftRequestConsumed(draftRequest.requestId)
    if (draftRequest.kind === 'prefill') {
      applyDraftRequest(draftRequest)
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The request is an external command consumed exactly once; the send reports its failure state back to the composer.
    void submitCanvasDraft(draftRequest)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Each request is consumed exactly once; the send closure is read at that moment.
  }, [applyDraftRequest, draftRequest, onDraftRequestConsumed])
  const uploadAttachmentFiles = async (files: readonly File[]): Promise<void> => {
    if (mediaUploadPending) return
    const uploadScopeKey = panelScopeKey
    setAttachmentError(null)
    const mediaFiles = files.filter(isProjectAssistantMediaFile)
    const textFiles = files.filter((file) => !isProjectAssistantMediaFile(file))
    const validationCode = mediaFiles
      .map(validateProjectAssistantMediaAttachmentFile)
      .find((code) => code !== null)
      ?? textFiles.map(validateProjectAssistantTextAttachmentFile).find((code) => code !== null)
    if (validationCode) {
      setAttachmentError(resolveClientError(new Error(validationCode), t('attachments.mediaUploadFailed')))
      return
    }
    if (mediaFiles.length + composer.mediaAttachments.length > PROJECT_ASSISTANT_MEDIA_ATTACHMENT_MAX_FILES) {
      setAttachmentError(resolveClientError(new Error('PROJECT_ASSISTANT_MEDIA_ATTACHMENTS_TOO_MANY'), t('attachments.mediaUploadFailed')))
      return
    }
    if (textFiles.length + composer.attachments.length > PROJECT_ASSISTANT_TEXT_ATTACHMENT_MAX_FILES) {
      setAttachmentError(resolveClientError(new Error('PROJECT_ASSISTANT_TEXT_ATTACHMENTS_TOO_MANY'), t('attachments.mediaUploadFailed')))
      return
    }
    setMediaUploadPending(true)
    try {
      const mediaRoom =
        PROJECT_ASSISTANT_MEDIA_ATTACHMENT_MAX_FILES - composer.mediaAttachments.length
      for (const file of mediaFiles.slice(0, Math.max(mediaRoom, 0))) {
        const attachment = await uploadProjectAssistantMediaAttachment({
          projectId,
          file,
        })
        if (panelScopeKeyRef.current !== uploadScopeKey) return
        composer.addMediaAttachment(attachment)
      }
      const textRoom = PROJECT_ASSISTANT_TEXT_ATTACHMENT_MAX_FILES - composer.attachments.length
      for (const file of textFiles.slice(0, Math.max(textRoom, 0))) {
        const attachment = await uploadProjectAssistantTextAttachment({ file })
        if (panelScopeKeyRef.current !== uploadScopeKey) return
        composer.addAttachment(attachment)
      }
    } catch (error) {
      if (panelScopeKeyRef.current === uploadScopeKey) {
        setAttachmentError(resolveClientError(error, t('attachments.mediaUploadFailed')))
      }
    } finally {
      if (panelScopeKeyRef.current === uploadScopeKey) {
        setMediaUploadPending(false)
      }
    }
  }
  const attachmentPicker = useAttachmentFilePicker({
    accept: `${PROJECT_ASSISTANT_TEXT_ATTACHMENT_ACCEPT},${PROJECT_ASSISTANT_MEDIA_ATTACHMENT_ACCEPT}`,
    disabled: pending,
    onFiles: (files) => {
      void uploadAttachmentFiles(files)
    },
  })
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset upload UI when changing project; the committed scope ref fences late completions.
    setMediaUploadPending(false)
    setAttachmentError(null)
  }, [panelScopeKey])
  return (
    <>
      <WorkspaceAssistantComposer
          value={composer.text}
          textareaRef={composer.textareaRef}
          selection={selection}
          error={error}
          pending={pending}
          canStopReply={canStopReply}
          attachments={composer.attachments}
          mediaAttachments={composer.mediaAttachments}
          attachDisabled={
            composer.attachments.length >=
              PROJECT_ASSISTANT_TEXT_ATTACHMENT_MAX_FILES &&
            composer.mediaAttachments.length >=
              PROJECT_ASSISTANT_MEDIA_ATTACHMENT_MAX_FILES
          }
          mediaUploadPending={mediaUploadPending}
          attachmentError={attachmentError}
          onChange={composer.setText}
          onSubmit={async () => {
            setAttachmentError(null)
            // The selected canvas image is delivered as a real
            // media attachment (signed receipt from the single
            // token authority), so the model actually sees it.
            // A mint failure blocks the send with a visible
            // error instead of silently sending a blind message.
            let extraMediaAttachments: readonly ProjectAssistantMediaAttachment[] = []
            if (selection?.mediaType === 'image') {
              try {
                extraMediaAttachments = [await mintProjectAssistantResourceAttachment({
                  projectId,
                  resourceId: selection.targetId,
                  previewUrl: selection.previewUrl,
                })]
              } catch (error) {
                setAttachmentError(resolveClientError(error, t('attachments.mediaUploadFailed')))
                return
              }
            }
            // Send failures surface through chat.error/controlError
            // (rendered under the composer); never as an unhandled
            // rejection reaching the React overlay.
            try {
              await composer.submit({ extraMediaAttachments })
            } catch {
              return
            }
            // The selection is consumed by the delivered message;
            // a lingering chip after send reads as "still pending".
            if (selection) onClearSelection()
          }}
          onStopReply={onStopReply}
          onAttachClick={attachmentPicker.open}
          onRemoveAttachment={composer.removeAttachment}
          onRemoveMediaAttachment={composer.removeMediaAttachment}
          onPasteMediaFiles={(files) => {
            void uploadAttachmentFiles(files)
          }}
          onClearSelection={onClearSelection}
      />
      {attachmentPicker.input}
    </>
  )
}

// Draft, attachment and IME updates stay below the conversation runtime.
export const WorkspaceAssistantComposerController = memo(WorkspaceAssistantComposerControllerImpl)
