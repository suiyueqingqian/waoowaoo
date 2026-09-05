import { NextResponse } from 'next/server'
import type { EditionRouteHandlersContract } from '@/lib/edition/contracts/routes'

function unavailable(): Promise<Response> {
  return Promise.resolve(NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }))
}

export const editionRouteHandlers = {
  publicBetaWaitlistPost: unavailable,
  announcementsGet: unavailable,
  announcementAcknowledgePost: unavailable,
  authPhoneCaptchaPost: unavailable,
  authPhoneSendCodePost: unavailable,
  authWechatAttemptPost: unavailable,
  authWechatCallbackGet: unavailable,
  authWechatCallbackPost: unavailable,
  authWechatEventsPost: unavailable,
  userSecurityGet: unavailable,
  userSecurityPost: unavailable,
  userSecurityPatch: unavailable,
  paidBetaGroupQrGet: unavailable,
  paidBetaPaymentStatusGet: unavailable,
  paymentsRechargeConfigGet: unavailable,
  paymentsStripeCheckoutPost: unavailable,
  paymentsStripePlanQuotePost: unavailable,
  paymentsStripePlanPost: unavailable,
  paymentsStripeWalletIntentPost: unavailable,
  paymentsStripeWalletStatusGet: unavailable,
  paymentsStripeWebhookPost: unavailable,
  paymentsSubscriptionConfigGet: unavailable,
  adminCreditsGrantPost: unavailable,
  userBalanceGet: unavailable,
  userCostsGet: unavailable,
  userCostDetailsGet: unavailable,
  userTransactionsGet: unavailable,
} satisfies EditionRouteHandlersContract
