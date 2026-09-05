'use client'

import { editionClient as selectedEditionClient } from '@edition-implementation/client'
import type { EditionClientContract } from '@/lib/edition/contracts/client'

export const editionClient: EditionClientContract = selectedEditionClient
export const WorkspaceAnnouncementHost: EditionClientContract['WorkspaceAnnouncementHost'] =
  selectedEditionClient.WorkspaceAnnouncementHost
export const AuthEntryCard: EditionClientContract['AuthEntryCard'] =
  selectedEditionClient.AuthEntryCard
export const PaidBetaCheckoutSuccessDialog: EditionClientContract['PaidBetaCheckoutSuccessDialog'] =
  selectedEditionClient.PaidBetaCheckoutSuccessDialog
export const AccountSecurityTab: EditionClientContract['AccountSecurityTab'] =
  selectedEditionClient.AccountSecurityTab
export const ProfileOverviewSection: EditionClientContract['ProfileOverviewSection'] =
  selectedEditionClient.ProfileOverviewSection
export const ProfileBillingSection: EditionClientContract['ProfileBillingSection'] =
  selectedEditionClient.ProfileBillingSection
