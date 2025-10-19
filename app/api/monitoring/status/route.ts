
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const totalMonitors = await prisma.monitor.count({
      where: { isEnabled: true }
    })

    const monitorsByStatus = await prisma.monitor.groupBy({
      by: ['status'],
      where: { isEnabled: true },
      _count: true
    })

    const recentChecks = await prisma.monitorCheck.count({
      where: {
        checkedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }
    })

    const ongoingIncidents = await prisma.incident.count({
      where: { status: 'ONGOING' }
    })

    const status = {
      totalMonitors,
      monitorsByStatus: monitorsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>),
      recentChecks,
      ongoingIncidents,
      lastUpdate: new Date().toISOString()
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching monitoring status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
