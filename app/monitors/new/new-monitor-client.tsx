
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Globe, Settings, Code, Clock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'

export function NewMonitorClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'HTTP' as const,
    method: 'GET' as const,
    headers: '{}',
    body: '',
    checkInterval: 300,
    timeout: 30,
    expectedStatus: 200,
    followRedirects: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Parse headers JSON
      let headers = undefined
      if (formData.headers.trim() && formData.headers !== '{}') {
        try {
          headers = JSON.parse(formData.headers)
        } catch (e) {
          toast({
            title: 'Error',
            description: 'Invalid JSON format for headers',
            variant: 'destructive'
          })
          setLoading(false)
          return
        }
      }

      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          headers,
          body: formData.body || undefined
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Monitor created successfully!'
        })
        router.push('/monitors')
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to create monitor',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error creating monitor:', error)
      toast({
        title: 'Error',
        description: 'Failed to create monitor',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            href="/monitors" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Monitors
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add New Monitor</h1>
          <p className="mt-2 text-gray-600">
            Set up monitoring for your website or API endpoint
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="request" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Request
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Configuration</CardTitle>
                  <CardDescription>
                    Configure the essential settings for your monitor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Monitor Name *</Label>
                    <Input
                      id="name"
                      placeholder="My Website"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">URL to Monitor *</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={formData.url}
                      onChange={(e) => updateFormData('url', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Monitor Type</Label>
                      <Select value={formData.type} onValueChange={(value) => updateFormData('type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HTTP">HTTP/HTTPS</SelectItem>
                          <SelectItem value="API">API Endpoint</SelectItem>
                          <SelectItem value="PING">Ping</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method">HTTP Method</Label>
                      <Select value={formData.method} onValueChange={(value) => updateFormData('method', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="HEAD">HEAD</SelectItem>
                          <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Advanced Settings
                  </CardTitle>
                  <CardDescription>
                    Fine-tune monitoring behavior and intervals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkInterval">Check Interval (seconds)</Label>
                      <Select 
                        value={formData.checkInterval.toString()} 
                        onValueChange={(value) => updateFormData('checkInterval', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">1 minute (Premium)</SelectItem>
                          <SelectItem value="300">5 minutes</SelectItem>
                          <SelectItem value="600">10 minutes</SelectItem>
                          <SelectItem value="1800">30 minutes</SelectItem>
                          <SelectItem value="3600">1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeout">Timeout (seconds)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        min="5"
                        max="120"
                        value={formData.timeout}
                        onChange={(e) => updateFormData('timeout', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expectedStatus">Expected Status Code</Label>
                      <Input
                        id="expectedStatus"
                        type="number"
                        min="100"
                        max="599"
                        value={formData.expectedStatus}
                        onChange={(e) => updateFormData('expectedStatus', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="followRedirects"
                        checked={formData.followRedirects}
                        onCheckedChange={(checked) => updateFormData('followRedirects', checked)}
                      />
                      <Label htmlFor="followRedirects">Follow Redirects</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="request">
              <Card>
                <CardHeader>
                  <CardTitle>Request Configuration</CardTitle>
                  <CardDescription>
                    Configure custom headers and request body
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="headers">Custom Headers (JSON)</Label>
                    <Textarea
                      id="headers"
                      placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                      value={formData.headers}
                      onChange={(e) => updateFormData('headers', e.target.value)}
                      rows={4}
                    />
                    <p className="text-sm text-gray-500">
                      Enter custom headers as valid JSON. Leave empty or use {} for no headers.
                    </p>
                  </div>

                  {(['POST', 'PUT', 'PATCH'].includes(formData.method)) && (
                    <div className="space-y-2">
                      <Label htmlFor="body">Request Body</Label>
                      <Textarea
                        id="body"
                        placeholder="Request body content"
                        value={formData.body}
                        onChange={(e) => updateFormData('body', e.target.value)}
                        rows={6}
                      />
                      <p className="text-sm text-gray-500">
                        Content to send in the request body (for POST, PUT, PATCH methods)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4 pt-6">
            <Link href="/monitors">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Monitor'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
