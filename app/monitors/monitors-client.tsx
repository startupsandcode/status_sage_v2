
'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Globe, 
  Clock, 
  Activity,
  Settings,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'

interface Monitor {
  id: string
  name: string
  url: string
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN'
  type: string
  method: string
  checkInterval: number
  lastCheck: string | null
  currentResponseTime: number | null
  uptimePercentage24h: number | null
  uptimePercentage7d: number | null  
  uptimePercentage30d: number | null
  avgResponseTime24h: number | null
  isEnabled: boolean
  createdAt: string
  _count: {
    incidents: number
  }
}

export function MonitorsClient() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMonitors()
  }, [])

  const fetchMonitors = async () => {
    try {
      const response = await fetch('/api/monitors')
      if (response.ok) {
        const data = await response.json()
        setMonitors(data)
      }
    } catch (error) {
      console.error('Failed to fetch monitors:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch monitors',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteMonitor = async (id: string) => {
    try {
      const response = await fetch(`/api/monitors/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setMonitors(monitors.filter(m => m.id !== id))
        toast({
          title: 'Success',
          description: 'Monitor deleted successfully'
        })
      } else {
        throw new Error('Failed to delete monitor')
      }
    } catch (error) {
      console.error('Failed to delete monitor:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete monitor',
        variant: 'destructive'
      })
    }
  }

  const toggleMonitor = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/monitors/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isEnabled: !enabled })
      })
      
      if (response.ok) {
        setMonitors(monitors.map(m => 
          m.id === id ? { ...m, isEnabled: !enabled } : m
        ))
        toast({
          title: 'Success',
          description: `Monitor ${!enabled ? 'enabled' : 'disabled'} successfully`
        })
      } else {
        throw new Error('Failed to toggle monitor')
      }
    } catch (error) {
      console.error('Failed to toggle monitor:', error)
      toast({
        title: 'Error',
        description: 'Failed to update monitor',
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

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    return `${Math.floor(minutes / 60)}h`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitors</h1>
            <p className="mt-2 text-gray-600">
              Manage and monitor all your websites and APIs
            </p>
          </div>
          <Link href="/monitors/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Monitor
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <Card>
                  <CardHeader>
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : monitors.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No monitors yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Start monitoring your websites and APIs by creating your first monitor.
            </p>
            <Link href="/monitors/new">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Monitor
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitors.map((monitor, index) => (
              <motion.div
                key={monitor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`hover:shadow-lg transition-all duration-300 ${
                  !monitor.isEnabled ? 'opacity-60' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        {getStatusIcon(monitor.status)}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {monitor.name}
                          </CardTitle>
                          <CardDescription className="truncate">
                            {monitor.url}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge 
                        className={`text-xs border ${getStatusColor(monitor.status)}`}
                        variant="outline"
                      >
                        {monitor.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Uptime (24h)</div>
                        <div className="font-medium">
                          {monitor.uptimePercentage24h?.toFixed(1) || '0.0'}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Response Time</div>
                        <div className="font-medium">
                          {monitor.currentResponseTime || '--'}ms
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Check Interval</div>
                        <div className="font-medium">
                          {formatInterval(monitor.checkInterval)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Last Check</div>
                        <div className="font-medium">
                          {formatDate(monitor.lastCheck)}
                        </div>
                      </div>
                    </div>

                    {monitor._count.incidents > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{monitor._count.incidents} active incident(s)</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Link href={`/monitors/${monitor.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/monitors/${monitor.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMonitor(monitor.id, monitor.isEnabled)}
                        >
                          {monitor.isEnabled ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Monitor</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{monitor.name}&quot;? This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMonitor(monitor.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
