
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateAlertSettingsSchema = z.object({
  emailOnDown: z.boolean(),
  emailOnUp: z.boolean(),
  emailOnDegraded: z.boolean(),
  notificationCooldown: z.number().min(60).max(3600)
})

// GET /api/settings/alerts - Get user's alert settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alertSettings = await prisma.alertSetting.findUnique({
      where: { userId: session.user.id }
    })

    if (!alertSettings) {
      // Create default settings if they don't exist
      const defaultSettings = await prisma.alertSetting.create({
        data: {
          userId: session.user.id,
          emailOnDown: true,
          emailOnUp: true,
          emailOnDegraded: false,
          notificationCooldown: 300
        }
      })
      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(alertSettings)
  } catch (error) {
    console.error('Error fetching alert settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/settings/alerts - Update user's alert settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = updateAlertSettingsSchema.parse(body)

    const updatedSettings = await prisma.alertSetting.upsert({
      where: { userId: session.user.id },
      update: validatedData,
      create: {
        ...validatedData,
        userId: session.user.id
      }
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating alert settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
