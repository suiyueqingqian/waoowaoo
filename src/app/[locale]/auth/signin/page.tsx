import { readPublicDeploymentFeatures } from '@/lib/deployment/server-features'
import { AuthEntryCard } from '@/lib/edition/current/client'

export const dynamic = 'force-dynamic'

export default function SignIn() {
  const features = readPublicDeploymentFeatures()
  return <AuthEntryCard features={features} />
}
