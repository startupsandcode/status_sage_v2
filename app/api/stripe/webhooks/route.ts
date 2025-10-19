
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        await handleSubscriptionCreate(session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as any
        await handleSubscriptionUpdate(subscription)
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as any
        await handleSubscriptionDelete(deletedSubscription)
        break

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as any
        await handleInvoicePaymentSucceeded(invoice)
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as any
        await handleInvoicePaymentFailed(failedInvoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleSubscriptionCreate(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) return

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'PREMIUM',
      subscriptionId: session.subscription as string,
      subscriptionStatus: 'active'
    }
  })

  console.log(`Subscription created for user ${userId}`)
}

async function handleSubscriptionUpdate(subscription: any) {
  const user = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id }
  })

  if (!user) return

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionEndsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
      subscriptionTier: subscription.status === 'active' ? 'PREMIUM' : 'FREE'
    }
  })

  console.log(`Subscription updated for user ${user.id}: ${subscription.status}`)
}

async function handleSubscriptionDelete(subscription: any) {
  const user = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id }
  })

  if (!user) return

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'canceled',
      subscriptionEndsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
    }
  })

  console.log(`Subscription canceled for user ${user.id}`)
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const subscriptionId = invoice.subscription ? String(invoice.subscription) : null
  if (subscriptionId) {
    const user = await prisma.user.findFirst({
      where: { subscriptionId }
    })

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'active',
          subscriptionTier: 'PREMIUM'
        }
      })
      console.log(`Payment succeeded for user ${user.id}`)
    }
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription ? String(invoice.subscription) : null
  if (subscriptionId) {
    const user = await prisma.user.findFirst({
      where: { subscriptionId }
    })

    if (user) {
      console.log(`Payment failed for user ${user.id}`)
      // You might want to send an email notification here
    }
  }
}
