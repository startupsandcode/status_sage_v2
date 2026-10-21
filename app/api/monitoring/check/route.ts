
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { safeMonitorFetch } from '@/lib/safe-fetch'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface MonitorCheckResult {
  status: 'UP' | 'DOWN' | 'DEGRADED'
  responseTime: number | null
  statusCode: number | null
  errorMessage: string | null
}

async function checkMonitor(monitor: any): Promise<MonitorCheckResult> {
  try {
    const startTime = Date.now()
    
    // Prepare request options
    const options: RequestInit = {
      method: monitor.method,
      signal: AbortSignal.timeout(monitor.timeout * 1000),
      redirect: monitor.followRedirects ? 'follow' : 'manual'
    }

    // Add headers if provided
    if (monitor.headers) {
      options.headers = monitor.headers
    }

    // Add body for POST/PUT/PATCH requests
    if (monitor.body && ['POST', 'PUT', 'PATCH'].includes(monitor.method)) {
      options.body = monitor.body
      
      // Set default content-type if not provided
      if (!options.headers) {
        options.headers = {} as Record<string, string>
      }
      const headers = options.headers as Record<string, string>
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json'
      }
    }

    const response = await safeMonitorFetch(monitor.url, options, {
      followRedirects: monitor.followRedirects,
    })
    const responseTime = Date.now() - startTime

    // Check if status matches expected
    const expectedStatus = monitor.expectedStatus || 200
    const statusMatches = response.status === expectedStatus

    let status: 'UP' | 'DOWN' | 'DEGRADED'
    if (statusMatches && response.ok) {
      status = 'UP'
    } else if (!response.ok || !statusMatches) {
      status = 'DOWN'
    } else if (responseTime > (monitor.timeout * 1000 * 0.8)) {
      // If response time is > 80% of timeout, consider degraded
      status = 'DEGRADED'
    } else {
      status = 'UP'
    }

    return {
      status,
      responseTime,
      statusCode: response.status,
      errorMessage: null
    }
  } catch (error: any) {
    console.error(`Monitor check failed for ${monitor.url}:`, error.message)
    
    return {
      status: 'DOWN',
      responseTime: null,
      statusCode: null,
      errorMessage: error.message || 'Unknown error'
    }
  }
}

async function updateMonitorStatus(monitorId: string, result: MonitorCheckResult) {
  const now = new Date()
  
  // Get current monitor status
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    select: { 
      status: true, 
      lastUptime: true, 
      lastDowntime: true,
      incidents: {
        where: { status: 'ONGOING' },
        take: 1
      }
    }
  })

  if (!monitor) return

  const wasUp = monitor.status === 'UP'
  const isUp = result.status === 'UP'
  const statusChanged = monitor.status !== result.status

  // Update monitor with latest check results
  await prisma.monitor.update({
    where: { id: monitorId },
    data: {
      status: result.status,
      lastCheck: now,
      currentResponseTime: result.responseTime,
      lastUptime: isUp ? now : monitor.lastUptime,
      lastDowntime: !isUp ? now : monitor.lastDowntime
    }
  })

  // Create monitor check record
  await prisma.monitorCheck.create({
    data: {
      monitorId,
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
      checkedAt: now
    }
  })

  // Handle incidents
  if (statusChanged) {
    if (!isUp && wasUp) {
      // Site went down - create new incident
      await prisma.incident.create({
        data: {
          monitorId,
          status: 'ONGOING',
          startedAt: now,
          description: `Monitor went ${result.status.toLowerCase()}: ${result.errorMessage || 'Status check failed'}`
        }
      })
    } else if (isUp && !wasUp) {
      // Site came back up - resolve ongoing incidents
      const ongoingIncidents = await prisma.incident.findMany({
        where: {
          monitorId,
          status: 'ONGOING'
        }
      })

      for (const incident of ongoingIncidents) {
        const duration = Math.floor((now.getTime() - new Date(incident.startedAt).getTime()) / 1000)
        
        await prisma.incident.update({
          where: { id: incident.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: now,
            duration,
            description: incident.description + ` - Resolved after ${Math.floor(duration / 60)} minutes`
          }
        })
      }
    }
  }

  return statusChanged
}

async function calculateUptimeMetrics(monitorId: string) {
  const now = new Date()
  
  // Calculate uptime for different periods
  const periods = [
    { hours: 24, field: 'uptimePercentage24h' },
    { hours: 24 * 7, field: 'uptimePercentage7d' },
    { hours: 24 * 30, field: 'uptimePercentage30d' }
  ]

  const updates: any = {}

  for (const period of periods) {
    const startTime = new Date(now.getTime() - (period.hours * 60 * 60 * 1000))
    
    const checks = await prisma.monitorCheck.findMany({
      where: {
        monitorId,
        checkedAt: { gte: startTime }
      }
    })

    if (checks.length > 0) {
      const upChecks = checks.filter(check => check.status === 'UP').length
      const uptimePercentage = (upChecks / checks.length) * 100
      updates[period.field] = uptimePercentage

      // Also calculate average response time for 24h
      if (period.hours === 24) {
        const responseTimes = checks
          .filter(check => check.responseTime !== null)
          .map(check => check.responseTime!)
        
        if (responseTimes.length > 0) {
          const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          updates.avgResponseTime24h = avgResponseTime
        }
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.monitor.update({
      where: { id: monitorId },
      data: updates
    })
  }
}

async function runAllDueMonitors() {
  const now = new Date()
  const monitors = await prisma.monitor.findMany({
    where: {
      isEnabled: true,
      OR: [
        { lastCheck: null },
        {
          lastCheck: {
            lt: new Date(now.getTime() - 60 * 1000)
          }
        }
      ]
    }
  })

  const results = []
  let checkedCount = 0

  for (const monitor of monitors) {
    if (monitor.lastCheck) {
      const timeSinceLastCheck = now.getTime() - monitor.lastCheck.getTime()
      const intervalMs = monitor.checkInterval * 1000
      if (timeSinceLastCheck < intervalMs) {
        continue
      }
    }

    try {
      const result = await checkMonitor(monitor)
      const statusChanged = await updateMonitorStatus(monitor.id, result)
      await calculateUptimeMetrics(monitor.id)
      results.push({ monitorId: monitor.id, name: monitor.name, result, statusChanged })
      checkedCount++
    } catch (error: any) {
      console.error(`Failed to check monitor ${monitor.id}:`, error)
      results.push({ monitorId: monitor.id, name: monitor.name, error: error?.message || 'Unknown error' })
    }
  }

  return NextResponse.json({
    message: `Checked ${checkedCount} monitors`,
    totalFound: monitors.length,
    results
  })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runAllDueMonitors()
}

// Main check endpoint - can be called manually or by cron
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { monitorId } = body

    if (monitorId) {
      // Users may only trigger their own enabled monitors.
      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId, userId: session.user.id, isEnabled: true }
      })

      if (!monitor) {
        return NextResponse.json({ error: 'Monitor not found or disabled' }, { status: 404 })
      }

      const result = await checkMonitor(monitor)
      const statusChanged = await updateMonitorStatus(monitorId, result)
      await calculateUptimeMetrics(monitorId)

      return NextResponse.json({ 
        monitorId, 
        result, 
        statusChanged,
        message: 'Monitor checked successfully' 
      })
    }

    return NextResponse.json({ error: 'Monitor ID required' }, { status: 400 })
  } catch (error) {
    console.error('Monitor check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
