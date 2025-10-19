
// Simple monitoring service that can be triggered by external cron jobs or serverless functions

export class MonitoringService {
  private static instance: MonitoringService
  private isRunning = false

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  async runMonitoringCycle(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitoring cycle already running, skipping...')
      return
    }

    this.isRunning = true
    console.log('Starting monitoring cycle...')

    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/monitoring/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Monitoring cycle completed:', result.message)
        console.log(`Checked ${result.results?.length || 0} monitors`)
      } else {
        console.error('Monitoring cycle failed:', response.status)
      }
    } catch (error) {
      console.error('Monitoring cycle error:', error)
    } finally {
      this.isRunning = false
    }
  }

  // Start periodic monitoring (for development - in production use external cron)
  startPeriodicMonitoring(intervalMinutes: number = 5): void {
    console.log(`Starting periodic monitoring every ${intervalMinutes} minutes`)
    
    // Run immediately
    this.runMonitoringCycle()
    
    // Then run on schedule
    setInterval(() => {
      this.runMonitoringCycle()
    }, intervalMinutes * 60 * 1000)
  }
}

// Initialize monitoring service in development
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  // Only run on server side and in development
  const service = MonitoringService.getInstance()
  
  // Start monitoring cycle every 2 minutes in development
  setTimeout(() => {
    service.startPeriodicMonitoring(2)
  }, 10000) // Wait 10 seconds after startup
}
