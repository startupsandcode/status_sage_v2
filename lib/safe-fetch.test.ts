import assert from 'node:assert/strict'
import test from 'node:test'
import { assertSafeMonitorUrl, isPrivateAddress } from './safe-fetch'

test('rejects private and special-use IP addresses', () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '::1',
    '::ffff:7f00:1',
    '::ffff:a9fe:a9fe',
    'fc00::1',
    'fe80::1',
  ]) {
    assert.equal(isPrivateAddress(address), true, address)
  }
})

test('accepts public IP addresses', () => {
  assert.equal(isPrivateAddress('1.1.1.1'), false)
  assert.equal(isPrivateAddress('2606:4700:4700::1111'), false)
})

test('rejects unsafe URL syntax and local hostnames', async () => {
  for (const value of [
    'ftp://example.com',
    'http://user:password@example.com',
    'http://localhost',
    'http://service.local',
    'http://127.0.0.1',
    'http://[::1]',
  ]) {
    await assert.rejects(() => assertSafeMonitorUrl(value), /allowed|public/i, value)
  }
})

test('accepts an HTTPS URL when every resolved address is public', async () => {
  const url = await assertSafeMonitorUrl('https://example.com/health', async () => [
    { address: '93.184.216.34', family: 4 },
  ])

  assert.equal(url.href, 'https://example.com/health')
})

test('rejects a hostname when any resolved address is private', async () => {
  await assert.rejects(
    () => assertSafeMonitorUrl('https://example.com', async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]),
    /public/i,
  )
})

test('rejects cross-origin redirects before forwarding headers or bodies', async () => {
  const fetcher = async () => new Response(null, {
    status: 302,
    headers: { location: 'https://other.example/collect' },
  }) as any

  const { safeMonitorFetch } = await import('./safe-fetch')
  await assert.rejects(
    () => safeMonitorFetch(
      'https://example.com/start',
      { method: 'POST', headers: { 'x-api-key': 'secret' }, body: 'sensitive' },
      {
        resolver: async () => [{ address: '93.184.216.34', family: 4 }],
        fetcher,
      },
    ),
    /cross-origin redirects/i,
  )
})
