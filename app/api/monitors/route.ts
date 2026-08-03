
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { assertSafeMonitorUrl, UnsafeMonitorUrlError } from '@/lib/safe-fetch'

export const dynamic = 'force-dynamic'

const createMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL'),
  type: z.enum(['HTTP', 'API', 'PING']).default('HTTP'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  checkInterval: z.number().min(60).max(3600).default(300), // 1 minute to 1 hour
  timeout: z.number().min(5).max(120).default(30), // 5 seconds to 2 minutes
  expectedStatus: z.number().optional().default(200),
  followRedirects: z.boolean().default(true)
})

// GET /api/monitors - Get all monitors for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const monitors = await prisma.monitor.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        type: true,
        method: true,
        checkInterval: true,
        lastCheck: true,
        currentResponseTime: true,
        uptimePercentage24h: true,
        uptimePercentage7d: true,
        uptimePercentage30d: true,
        avgResponseTime24h: true,
        isEnabled: true,
        createdAt: true,
        _count: {
          select: {
            incidents: {
              where: {
                status: 'ONGOING'
              }
            }
          }
        }
      }
    })

    return NextResponse.json(monitors)
  } catch (error) {
    console.error('Error fetching monitors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/monitors - Create a new monitor
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        subscriptionTier: true,
        _count: {
          select: { monitors: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check subscription limits
    if (user.subscriptionTier === 'FREE' && user._count.monitors >= 3) {
      return NextResponse.json(
        { error: 'Free tier allows maximum 3 monitors. Please upgrade to Premium.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validatedData = createMonitorSchema.parse(body)
    await assertSafeMonitorUrl(validatedData.url)

    // Adjust check interval based on subscription
    let checkInterval = validatedData.checkInterval
    if (user.subscriptionTier === 'FREE' && checkInterval < 300) {
      checkInterval = 300 // Minimum 5 minutes for free users
    }

    const monitor = await prisma.monitor.create({
      data: {
        ...validatedData,
        checkInterval,
        userId: session.user.id,
        headers: validatedData.headers || undefined
      }
    })

    return NextResponse.json(monitor, { status: 201 })
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
    console.error('Error creating monitor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
