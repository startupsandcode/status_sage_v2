
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  User, 
  Crown, 
  CreditCard, 
  Calendar,
  Check,
  Zap,
  Shield
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface User {
  id: string
  name: string | null
  email: string
  subscriptionTier: 'FREE' | 'PREMIUM'
  subscriptionStatus: string | null
  subscriptionEndsAt: string | null
  stripeCustomerId: string | null
  _count: {
    monitors: number
  }
}

export function AccountClient() {
  const { data: session } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load account information',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      toast({
        title: 'Error',
        description: 'Failed to start upgrade process',
        variant: 'destructive'
      })
    } finally {
      setUpgrading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST'
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        throw new Error('Failed to create portal session')
      }
    } catch (error) {
      console.error('Failed to create portal session:', error)
      toast({
        title: 'Error',
        description: 'Failed to access billing portal',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  const monitorLimit = user?.subscriptionTier === 'FREE' ? 3 : 'Unlimited'
  const monitorUsage = user?._count?.monitors || 0
  const usagePercentage = user?.subscriptionTier === 'FREE' 
    ? (monitorUsage / 3) * 100 
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-8 h-8" />
            Account
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your account and subscription settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your account details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{user?.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {user?.subscriptionTier === 'PREMIUM' ? (
                  <>
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Premium Plan
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-gray-500" />
                    Free Plan
                  </>
                )}
                <Badge 
                  className={`ml-2 ${
                    user?.subscriptionTier === 'PREMIUM' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  variant="secondary"
                >
                  {user?.subscriptionTier}
                </Badge>
              </CardTitle>
              <CardDescription>
                Your current subscription and usage information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Usage Information */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Monitors Used</span>
                  <span>{monitorUsage} of {monitorLimit}</span>
                </div>
                {user?.subscriptionTier === 'FREE' && (
                  <Progress value={usagePercentage} className="h-2" />
                )}
              </div>

              {/* Plan Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Current Plan Features</h4>
                  <ul className="space-y-2">
                    {user?.subscriptionTier === 'FREE' ? (
                      <>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          Up to 3 monitors
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          5-minute check frequency
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          30 days data retention
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          Email alerts
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          Unlimited monitors
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          1-minute check frequency
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          1 year data retention
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          Priority email alerts
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          Custom headers & auth
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {user?.subscriptionTier === 'FREE' && (
                  <div>
                    <h4 className="font-medium mb-3">Premium Features</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-500">
                        <Zap className="w-4 h-4 text-blue-500" />
                        Unlimited monitors
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-500">
                        <Zap className="w-4 h-4 text-blue-500" />
                        1-minute check frequency
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-500">
                        <Zap className="w-4 h-4 text-blue-500" />
                        1 year data retention
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-500">
                        <Zap className="w-4 h-4 text-blue-500" />
                        Advanced features
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                {user?.subscriptionTier === 'FREE' ? (
                  <Button 
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    {upgrading ? 'Processing...' : 'Upgrade to Premium'}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleManageBilling}
                    variant="outline"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Billing
                  </Button>
                )}
              </div>

              {user?.subscriptionEndsAt && (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {user.subscriptionStatus === 'active' 
                    ? `Next billing date: ${new Date(user.subscriptionEndsAt).toLocaleDateString()}`
                    : `Subscription ends: ${new Date(user.subscriptionEndsAt).toLocaleDateString()}`
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
