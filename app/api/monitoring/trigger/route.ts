
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Manual trigger endpoint for testing monitor checks
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { monitorId } = body

    if (!monitorId) {
      return NextResponse.json({ error: 'Monitor ID required' }, { status: 400 })
    }

    // Trigger the monitoring check
    const checkResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/monitoring/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ monitorId })
    })

    if (!checkResponse.ok) {
      throw new Error('Failed to trigger monitor check')
    }

    const result = await checkResponse.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error triggering monitor check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
