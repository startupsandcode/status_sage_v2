
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NewMonitorClient } from './new-monitor-client'

export const dynamic = 'force-dynamic'

export default async function NewMonitorPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin?callbackUrl=/monitors/new')
  }

  return <NewMonitorClient />
}
