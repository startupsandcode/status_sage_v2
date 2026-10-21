
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
    const checkUrl = new URL('/api/monitoring/check', req.nextUrl.origin)
    const checkResponse = await fetch(checkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || ''
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
