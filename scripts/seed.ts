
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test user with admin privileges
  const hashedPassword = await bcrypt.hash('johndoe123', 12)
  
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: hashedPassword,
      name: 'John Doe',
      subscriptionTier: 'PREMIUM', // Give admin premium access for testing
      alertSettings: {
        create: {
          emailOnDown: true,
          emailOnUp: true,
          emailOnDegraded: false,
          notificationCooldown: 300
        }
      }
    }
  })

  console.log('✅ Test user created:', testUser.email)

  // Create sample monitors for the test user
  const sampleMonitors = [
    {
      name: 'Google Homepage',
      url: 'https://www.google.com',
      type: 'HTTP' as const,
      method: 'GET' as const,
      checkInterval: 300,
      timeout: 30,
      expectedStatus: 200,
      followRedirects: true,
      status: 'UP' as const,
      uptimePercentage24h: 99.9,
      uptimePercentage7d: 99.8,
      uptimePercentage30d: 99.9,
      currentResponseTime: 45,
      avgResponseTime24h: 42.5,
      lastCheck: new Date(),
      lastUptime: new Date(),
      isEnabled: true
    },
    {
      name: 'GitHub API',
      url: 'https://api.github.com',
      type: 'API' as const,
      method: 'GET' as const,
      checkInterval: 600,
      timeout: 30,
      expectedStatus: 200,
      followRedirects: true,
      status: 'UP' as const,
      uptimePercentage24h: 100.0,
      uptimePercentage7d: 99.9,
      uptimePercentage30d: 99.8,
      currentResponseTime: 123,
      avgResponseTime24h: 118.2,
      lastCheck: new Date(),
      lastUptime: new Date(),
      isEnabled: true
    },
    {
      name: 'Example Website',
      url: 'https://httpstat.us/200',
      type: 'HTTP' as const,
      method: 'GET' as const,
      checkInterval: 300,
      timeout: 30,
      expectedStatus: 200,
      followRedirects: true,
      status: 'UP' as const,
      uptimePercentage24h: 98.5,
      uptimePercentage7d: 98.2,
      uptimePercentage30d: 98.8,
      currentResponseTime: 234,
      avgResponseTime24h: 245.8,
      lastCheck: new Date(),
      lastUptime: new Date(),
      isEnabled: true
    }
  ]

  for (const monitorData of sampleMonitors) {
    const monitor = await prisma.monitor.upsert({
      where: { 
        userId_name: {
          userId: testUser.id,
          name: monitorData.name
        }
      },
      update: {},
      create: {
        ...monitorData,
        userId: testUser.id
      }
    })
    console.log('✅ Sample monitor created:', monitor.name)

    // Create some sample monitoring data
    const now = new Date()
    for (let i = 0; i < 24; i++) {
      const checkedAt = new Date(now.getTime() - (i * 60 * 60 * 1000)) // Every hour for last 24 hours
      await prisma.monitorCheck.create({
        data: {
          monitorId: monitor.id,
          status: 'UP',
          responseTime: Math.floor(Math.random() * 100) + 50, // Random response time 50-150ms
          statusCode: 200,
          checkedAt: checkedAt
        }
      })
    }
    console.log(`✅ Created 24 sample checks for ${monitor.name}`)
  }

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
