
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get total monitors
    const totalMonitors = await prisma.monitor.count({
      where: { userId }
    })

    // Get monitors by status
    const monitorsByStatus = await prisma.monitor.groupBy({
      by: ['status'],
      where: { userId },
      _count: true
    })

    const upMonitors = monitorsByStatus.find(m => m.status === 'UP')?._count || 0
    const downMonitors = monitorsByStatus.find(m => m.status === 'DOWN')?._count || 0

    // Get average response time (last 24 hours)
    const avgResponseResult = await prisma.monitor.aggregate({
      where: { 
        userId,
        currentResponseTime: { not: null }
      },
      _avg: {
        currentResponseTime: true
      }
    })

    const avgResponseTime = Math.round(avgResponseResult._avg.currentResponseTime || 0)

    // Get incidents in last 24 hours
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const totalIncidents24h = await prisma.incident.count({
      where: {
        monitor: {
          userId
        },
        startedAt: {
          gte: twentyFourHoursAgo
        }
      }
    })

    const stats = {
      totalMonitors,
      upMonitors,
      downMonitors,
      avgResponseTime,
      totalIncidents24h
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
