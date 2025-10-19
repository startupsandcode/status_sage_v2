
'use client'

import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Globe, 
  AlertTriangle, 
  Clock, 
  Plus, 
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface Monitor {
  id: string
  name: string
  url: string
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN'
  uptimePercentage24h: number
  currentResponseTime: number | null
  lastCheck: string | null
}

interface DashboardStats {
  totalMonitors: number
  upMonitors: number
  downMonitors: number
  avgResponseTime: number
  totalIncidents24h: number
}

// Mock data for demonstration
const mockUpTimeData = [
  { time: '00:00', uptime: 100, responseTime: 45 },
  { time: '04:00', uptime: 99.9, responseTime: 52 },
  { time: '08:00', uptime: 100, responseTime: 41 },
  { time: '12:00', uptime: 98.5, responseTime: 38 },
  { time: '16:00', uptime: 100, responseTime: 44 },
  { time: '20:00', uptime: 100, responseTime: 47 },
]

export function DashboardClient() {
  const { data: session } = useSession()
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalMonitors: 0,
    upMonitors: 0,
    downMonitors: 0,
    avgResponseTime: 0,
    totalIncidents24h: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [monitorsRes, statsRes] = await Promise.all([
        fetch('/api/monitors'),
        fetch('/api/dashboard/stats')
      ])
      
      if (monitorsRes.ok) {
        const monitorsData = await monitorsRes.json()
        setMonitors(monitorsData)
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UP':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'DOWN':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'DEGRADED':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP':
        return 'text-green-600 bg-green-100'
      case 'DOWN':
        return 'text-red-600 bg-red-100'
      case 'DEGRADED':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage all your websites from one place
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Monitors</CardTitle>
                <Globe className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMonitors}</div>
                <p className="text-xs text-muted-foreground">
                  Active monitoring endpoints
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sites Up</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.upMonitors}</div>
                <p className="text-xs text-muted-foreground">
                  Currently operational
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Incidents</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalIncidents24h}</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Uptime Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                System Overview (24 Hours)
              </CardTitle>
              <CardDescription>
                Uptime percentage and average response times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockUpTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                    />
                    <YAxis 
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="uptime" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      name="Uptime %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      name="Response Time (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monitors List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Monitor Status
                  </CardTitle>
                  <CardDescription>
                    Current status of your monitored services
                  </CardDescription>
                </div>
                <Link href="/monitors/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Monitor
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : monitors?.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No monitors yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Get started by adding your first website monitor.
                    </p>
                    <Link href="/monitors/new">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Monitor
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {monitors?.slice(0, 5)?.map((monitor) => (
                      <motion.div
                        key={monitor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          {getStatusIcon(monitor.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate max-w-[200px]">
                                {monitor.name}
                              </h4>
                              <Badge 
                                className={`text-xs ${getStatusColor(monitor.status)}`}
                                variant="secondary"
                              >
                                {monitor.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 truncate max-w-[250px]">
                              {monitor.url}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {monitor.uptimePercentage24h?.toFixed(1) || '0.0'}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {monitor.currentResponseTime || '-- '}ms
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {monitors?.length > 5 && (
                      <div className="text-center pt-4">
                        <Link href="/monitors">
                          <Button variant="outline" size="sm">
                            View All Monitors
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Manage your monitoring setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/monitors/new">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Monitor
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button className="w-full justify-start" variant="outline">
                    <Activity className="w-4 h-4 mr-2" />
                    Alert Settings
                  </Button>
                </Link>
                <Link href="/account">
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
