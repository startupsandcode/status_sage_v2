
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover'
  })
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the origin from request headers for dynamic URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000'

    let customerId = user.stripeCustomerId

    // Create Stripe customer if it doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id
        }
      })
      
      customerId = customer.id
      
      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId }
      })
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'StatusSage Premium',
              description: 'Unlimited monitors, 1-minute checks, 1-year data retention',
            },
            unit_amount: 900, // $9.00
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      success_url: `${origin}/account?success=true`,
      cancel_url: `${origin}/account?canceled=true`,
      metadata: {
        userId: user.id
      }
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
