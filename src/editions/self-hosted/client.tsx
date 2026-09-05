'use client'

import type { EditionClientContract } from '@/lib/edition/contracts/client'
import AuthEntryCard from './AuthEntryCard'

function WorkspaceAnnouncementHost() {
  return null
}

function PaidBetaCheckoutSuccessDialog() {
  return null
}

function AccountSecurityTab() {
  return null
}

function ProfileOverviewSection() {
  return null
}

function ProfileBillingSection() {
  return null
}

export const editionClient = {
  ApiConfigConcurrency: null,
  WorkspaceAnnouncementHost,
  AuthEntryCard,
  PaidBetaCheckoutSuccessDialog,
  AccountSecurityTab,
  ProfileOverviewSection,
  ProfileBillingSection,
} satisfies EditionClientContract
