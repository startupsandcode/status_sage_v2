
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MonitorDetailClient } from './monitor-detail-client'

export const dynamic = 'force-dynamic'

interface MonitorDetailPageProps {
  params: {
    id: string
  }
}

export default async function MonitorDetailPage({ params }: MonitorDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin?callbackUrl=/monitors/' + params.id)
  }

  return <MonitorDetailClient monitorId={params.id} />
}
