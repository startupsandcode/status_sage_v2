import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NewMonitorClient } from '../../new/new-monitor-client'

export const dynamic = 'force-dynamic'

interface EditMonitorPageProps {
  params: {
    id: string
  }
}

export default async function EditMonitorPage({ params }: EditMonitorPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/monitors/${params.id}/edit`)}`)
  }

  return <NewMonitorClient monitorId={params.id} />
}
