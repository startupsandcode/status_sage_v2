
'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Globe, 
  Clock, 
  Activity,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Eye,
  Play
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'
import { toast } from '@/hooks/use-toast'

interface Monitor {
  id: string
  name: string
  url: string
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN'
  type: string
  method: string
  checkInterval: number
  timeout: number
  expectedStatus: number
  followRedirects: boolean
  lastCheck: string | null
  currentResponseTime: number | null
  uptimePercentage24h: number | null
  uptimePercentage7d: number | null  
  uptimePercentage30d: number | null
  avgResponseTime24h: number | null
  isEnabled: boolean
  createdAt: string
  checks: MonitorCheck[]
  incidents: Incident[]
}

interface MonitorCheck {
  id: string
  status: 'UP' | 'DOWN' | 'DEGRADED'
  responseTime: number | null
  statusCode: number | null
  errorMessage: string | null
  checkedAt: string
}

interface Incident {
  id: string
  status: 'ONGOING' | 'RESOLVED' | 'INVESTIGATING'
  startedAt: string
  resolvedAt: string | null
  duration: number | null
  description: string | null
}

interface MonitorDetailClientProps {
  monitorId: string
}

export function MonitorDetailClient({ monitorId }: MonitorDetailClientProps) {
  const [monitor, setMonitor] = useState<Monitor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMonitor()
  }, [monitorId])

  const fetchMonitor = async () => {
    try {
      const response = await fetch(`/api/monitors/${monitorId}`)
      if (response.ok) {
        const data = await response.json()
        setMonitor(data)
      } else if (response.status === 404) {
        toast({
          title: 'Error',
          description: 'Monitor not found',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to fetch monitor:', error)
      toast({
        title: 'Error',
        description: 'Failed to load monitor details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const triggerCheck = async () => {
    try {
      const response = await fetch('/api/monitoring/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ monitorId })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Monitor check triggered successfully'
        })
        // Refresh data after a short delay
        setTimeout(() => {
          fetchMonitor()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to trigger check:', error)
      toast({
        title: 'Error',
        description: 'Failed to trigger monitor check',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UP':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'DOWN':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'DEGRADED':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP':
        return 'text-green-600 bg-green-100 border-green-200'
      case 'DOWN':
        return 'text-red-600 bg-red-100 border-red-200'
      case 'DEGRADED':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  // Prepare chart data
  const chartData = monitor?.checks?.slice(-24)?.reverse()?.map(check => ({
    time: new Date(check.checkedAt).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    responseTime: check.responseTime || 0,
    status: check.status === 'UP' ? 1 : 0
  })) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!monitor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Monitor not found
            </h3>
            <p className="text-gray-500 mb-6">
              The monitor you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/monitors">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Monitors
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            href="/monitors" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Monitors
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(monitor.status)}
                <h1 className="text-3xl font-bold text-gray-900">{monitor.name}</h1>
                <Badge 
                  className={`border ${getStatusColor(monitor.status)}`}
                  variant="outline"
                >
                  {monitor.status}
                </Badge>
              </div>
              <p className="text-gray-600">{monitor.url}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={triggerCheck} size="sm">
                <Play className="w-4 h-4 mr-2" />
                Run Check
              </Button>
              <Link href={`/monitors/${monitor.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">24h Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {monitor.uptimePercentage24h?.toFixed(1) || '0.0'}%
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monitor.currentResponseTime || 0}ms
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Check Interval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(monitor.checkInterval / 60)}m
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {monitor.lastCheck 
                    ? new Date(monitor.lastCheck).toLocaleTimeString()
                    : 'Never'
                  }
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Response Time Chart */}
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
                Response Time (Last 24 Checks)
              </CardTitle>
              <CardDescription>
                Monitor performance over recent checks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
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
                      label={{ 
                        value: 'Response Time (ms)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fontSize: 11 }
                      }}
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
                      dataKey="responseTime" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                      name="Response Time (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Incidents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Incidents
              </CardTitle>
              <CardDescription>
                Latest incidents and downtime events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monitor.incidents?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No incidents recorded
                  </h3>
                  <p className="text-gray-500">
                    This monitor has been running smoothly with no recorded incidents.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monitor.incidents?.slice(0, 5)?.map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          incident.status === 'ONGOING' ? 'bg-red-500' : 'bg-green-500'
                        }`} />
                        <div>
                          <div className="font-medium text-sm">
                            {incident.description || 'Incident'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Started: {formatDate(incident.startedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={incident.status === 'ONGOING' ? 'destructive' : 'default'}>
                          {incident.status}
                        </Badge>
                        {incident.duration && (
                          <div className="text-xs text-gray-500 mt-1">
                            Duration: {formatDuration(incident.duration)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
