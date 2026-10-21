
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { assertSafeMonitorUrl, UnsafeMonitorUrlError } from '@/lib/safe-fetch'

export const dynamic = 'force-dynamic'

const updateMonitorSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  type: z.enum(['HTTP', 'API', 'PING']).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  checkInterval: z.number().min(60).max(3600).optional(),
  timeout: z.number().min(5).max(120).optional(),
  expectedStatus: z.number().optional(),
  followRedirects: z.boolean().optional(),
  isEnabled: z.boolean().optional()
})

// GET /api/monitors/[id] - Get a specific monitor
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        checks: {
          orderBy: { checkedAt: 'desc' },
          take: 100
        },
        incidents: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    return NextResponse.json(monitor)
  } catch (error) {
    console.error('Error fetching monitor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/monitors/[id] - Update a monitor
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    const body = await req.json()
    const validatedData = updateMonitorSchema.parse(body)
    if (validatedData.url) await assertSafeMonitorUrl(validatedData.url)

    const updatedMonitor = await prisma.monitor.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        headers: validatedData.headers || undefined,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedMonitor)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof UnsafeMonitorUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating monitor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/monitors/[id] - Delete a monitor
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    // Delete the monitor (cascading will handle related records)
    await prisma.monitor.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Monitor deleted successfully' })
  } catch (error) {
    console.error('Error deleting monitor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
