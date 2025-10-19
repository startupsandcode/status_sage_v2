
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MonitorsClient } from './monitors-client'

export const dynamic = 'force-dynamic'

export default async function MonitorsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin?callbackUrl=/monitors')
  }

  return <MonitorsClient />
}
