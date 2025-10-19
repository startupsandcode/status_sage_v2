
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Shield, Clock, Mail, BarChart3, Zap, Check, Star, Globe, Activity } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Header } from './header'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useEffect, useState } from 'react'

const features = [
  {
    icon: Shield,
    title: 'Reliable Monitoring',
    description: 'Monitor websites and APIs with 99.9% uptime reliability'
  },
  {
    icon: Clock,
    title: 'Real-time Alerts',
    description: 'Get instant email notifications when your sites go down'
  },
  {
    icon: BarChart3,
    title: 'Detailed Analytics',
    description: 'View response times, uptime percentages, and historical data'
  },
  {
    icon: Zap,
    title: 'Fast Checks',
    description: 'Monitor as frequently as every minute with premium plans'
  },
  {
    icon: Globe,
    title: 'Global Monitoring',
    description: 'Monitor from multiple geographic locations worldwide'
  },
  {
    icon: Activity,
    title: 'Incident Tracking',
    description: 'Track and manage incidents with detailed timelines'
  }
]

const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfect for small projects',
    features: [
      'Up to 3 monitors',
      '5-minute check frequency',
      '30 days data retention',
      'Email alerts',
      'Basic analytics'
    ],
    buttonText: 'Get Started Free',
    popular: false
  },
  {
    name: 'Premium',
    price: 9,
    description: 'For serious monitoring needs',
    features: [
      'Unlimited monitors',
      '1-minute check frequency',
      '1 year data retention',
      'Priority email alerts',
      'Advanced analytics',
      'Custom headers & auth',
      'Multiple HTTP methods'
    ],
    buttonText: 'Start Premium',
    popular: true
  }
]

export function LandingPage() {
  const { data: session } = useSession()
  const [ref, inView] = useInView({ triggerOnce: true })
  const [statsRef, statsInView] = useInView({ triggerOnce: true })
  const [uptime, setUptime] = useState(0)
  const [responseTime, setResponseTime] = useState(0)
  const [sitesMonitored, setSitesMonitored] = useState(0)

  useEffect(() => {
    if (statsInView) {
      const uptimeTimer = setInterval(() => {
        setUptime(prev => {
          if (prev < 99.9) return prev + 0.1
          return 99.9
        })
      }, 20)

      const responseTimer = setInterval(() => {
        setResponseTime(prev => {
          if (prev < 45) return prev + 1
          return 45
        })
      }, 50)

      const sitesTimer = setInterval(() => {
        setSitesMonitored(prev => {
          if (prev < 1000) return prev + 10
          return 1000
        })
      }, 30)

      return () => {
        clearInterval(uptimeTimer)
        clearInterval(responseTimer)
        clearInterval(sitesTimer)
      }
    }
  }, [statsInView])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200">
              <Star className="w-4 h-4 mr-2" />
              Trusted by 1000+ websites
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Website <span className="text-blue-600">Monitoring</span>
              <br />Made Simple
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Stay ahead of downtime with real-time monitoring, instant alerts, and detailed analytics. 
              Monitor your websites and APIs with confidence.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {session ? (
                <Link href="/dashboard">
                  <Button size="lg" className="px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700">
                    Go to Dashboard
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link href="/auth/signin">
                  <Button size="lg" className="px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700">
                    Start Monitoring Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-4 text-lg"
                onClick={() => {
                  const featuresSection = document.querySelector('#features-section')
                  featuresSection?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                View Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white" ref={statsRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
            >
              <div className="text-4xl font-bold text-blue-600 mb-2">{uptime.toFixed(1)}%</div>
              <div className="text-gray-600">Average Uptime</div>
            </motion.div>
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
            >
              <div className="text-4xl font-bold text-green-600 mb-2">{Math.round(responseTime)}ms</div>
              <div className="text-gray-600">Avg Response Time</div>
            </motion.div>
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
            >
              <div className="text-4xl font-bold text-purple-600 mb-2">{Math.round(sitesMonitored)}</div>
              <div className="text-gray-600">Sites Monitored</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="py-20 bg-gray-50" ref={ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to monitor
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive monitoring tools designed to keep your websites and APIs running smoothly.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your monitoring needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className={`relative h-full ${plan.popular ? 'ring-2 ring-blue-500 shadow-lg scale-105' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="flex items-baseline mt-4">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-gray-500 ml-1">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center">
                          <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {session ? (
                      <Link href="/dashboard">
                        <Button 
                          className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`} 
                          variant={plan.popular ? 'default' : 'outline'}
                        >
                          {plan.buttonText}
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/auth/signin">
                        <Button 
                          className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`} 
                          variant={plan.popular ? 'default' : 'outline'}
                        >
                          {plan.buttonText}
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Start monitoring your websites today
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of developers who trust StatusSage to keep their websites running smoothly.
            </p>
            {session ? (
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" className="px-8 py-4 text-lg">
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/auth/signin">
                <Button size="lg" variant="secondary" className="px-8 py-4 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-400 mr-3" />
            <span className="text-2xl font-bold">StatusSage</span>
          </div>
          <p className="text-gray-400 mb-4">
            Professional website monitoring made simple and reliable.
          </p>
          <div className="text-gray-400">
            © 2025 StatusSage. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
