
'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Settings, Save, Shield } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AlertSettings {
  id: string
  emailOnDown: boolean
  emailOnUp: boolean
  emailOnDegraded: boolean
  notificationCooldown: number
}

export function SettingsClient() {
  const [settings, setSettings] = useState<AlertSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/alerts')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load alert settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/settings/alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Alert settings saved successfully'
        })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save alert settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (field: keyof AlertSettings, value: any) => {
    if (!settings) return
    setSettings(prev => ({
      ...prev!,
      [field]: value
    }))
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your monitoring and notification preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Alert Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alert Settings
              </CardTitle>
              <CardDescription>
                Configure when and how you want to be notified about monitor status changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="emailOnDown">Email when site goes down</Label>
                        <p className="text-sm text-gray-500">
                          Get notified immediately when a monitored site becomes unavailable
                        </p>
                      </div>
                      <Switch
                        id="emailOnDown"
                        checked={settings.emailOnDown}
                        onCheckedChange={(checked) => updateSetting('emailOnDown', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="emailOnUp">Email when site comes back up</Label>
                        <p className="text-sm text-gray-500">
                          Get notified when a previously down site is back online
                        </p>
                      </div>
                      <Switch
                        id="emailOnUp"
                        checked={settings.emailOnUp}
                        onCheckedChange={(checked) => updateSetting('emailOnUp', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="emailOnDegraded">Email when site is degraded</Label>
                        <p className="text-sm text-gray-500">
                          Get notified when a site is experiencing performance issues
                        </p>
                      </div>
                      <Switch
                        id="emailOnDegraded"
                        checked={settings.emailOnDegraded}
                        onCheckedChange={(checked) => updateSetting('emailOnDegraded', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cooldown">Notification Cooldown</Label>
                    <Select 
                      value={settings.notificationCooldown.toString()} 
                      onValueChange={(value) => updateSetting('notificationCooldown', parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="600">10 minutes</SelectItem>
                        <SelectItem value="1800">30 minutes</SelectItem>
                        <SelectItem value="3600">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      Minimum time between notification emails for the same monitor
                    </p>
                  </div>

                  <div className="pt-6 border-t">
                    <Button onClick={saveSettings} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Privacy
              </CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Data Retention</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Your monitoring data is retained according to your subscription plan:
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1 ml-4">
                    <li>• Free tier: 30 days</li>
                    <li>• Premium tier: 1 year</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Export Data</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    You can export your monitoring data at any time.
                  </p>
                  <Button variant="outline" disabled>
                    Export Data (Coming Soon)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
