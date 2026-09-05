import type { NextRequest } from 'next/server'

export type EditionRouteParams = Record<string, string | string[] | undefined>
export type EditionRouteContext<TParams extends EditionRouteParams = EditionRouteParams> = {
  params: Promise<TParams>
}
export type EditionRequestHandler<TParams extends EditionRouteParams = EditionRouteParams> = (
  request: NextRequest,
  context: EditionRouteContext<TParams>,
) => Promise<Response>

export interface EditionRouteHandlersContract {
  readonly publicBetaWaitlistPost: EditionRequestHandler
  readonly announcementsGet: EditionRequestHandler
  readonly announcementAcknowledgePost: EditionRequestHandler<{ announcementId: string }>
  readonly authPhoneCaptchaPost: EditionRequestHandler
  readonly authPhoneSendCodePost: EditionRequestHandler
  readonly authWechatAttemptPost: EditionRequestHandler
  readonly authWechatCallbackGet: EditionRequestHandler
  readonly authWechatCallbackPost: EditionRequestHandler
  readonly authWechatEventsPost: EditionRequestHandler
  readonly userSecurityGet: EditionRequestHandler
  readonly userSecurityPost: EditionRequestHandler
  readonly userSecurityPatch: EditionRequestHandler
  readonly paidBetaGroupQrGet: EditionRequestHandler
  readonly paidBetaPaymentStatusGet: EditionRequestHandler
  readonly paymentsRechargeConfigGet: EditionRequestHandler
  readonly paymentsStripeCheckoutPost: EditionRequestHandler
  readonly paymentsStripePlanQuotePost: EditionRequestHandler
  readonly paymentsStripePlanPost: EditionRequestHandler
  readonly paymentsStripeWalletIntentPost: EditionRequestHandler
  readonly paymentsStripeWalletStatusGet: EditionRequestHandler
  readonly paymentsStripeWebhookPost: EditionRequestHandler
  readonly paymentsSubscriptionConfigGet: EditionRequestHandler
  readonly adminCreditsGrantPost: EditionRequestHandler
  readonly userBalanceGet: EditionRequestHandler
  readonly userCostsGet: EditionRequestHandler
  readonly userCostDetailsGet: EditionRequestHandler
  readonly userTransactionsGet: EditionRequestHandler
}
