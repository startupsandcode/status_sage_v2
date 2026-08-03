import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Agent, fetch as undiciFetch, interceptors } from 'undici'

type ResolvedAddress = { address: string; family: 4 | 6 }
type Resolver = (hostname: string) => Promise<ResolvedAddress[]>

const defaultResolver: Resolver = async (hostname) => {
  const addresses = await lookup(hostname, { all: true, verbatim: true })
  return addresses as ResolvedAddress[]
}

export class UnsafeMonitorUrlError extends Error {}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true
  }

  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0]
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4[1])
  const mappedHex = normalized.match(/^(?:::ffff:|(?:0:){5}ffff:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1], 16)
    const low = Number.parseInt(mappedHex[2], 16)
    return isPrivateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`)
  }

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('ff')
  )
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return isPrivateIpv4(address)
  if (family === 6) return isPrivateIpv6(address)
  return true
}

export async function assertSafeMonitorUrl(value: string, resolver: Resolver = defaultResolver): Promise<URL> {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeMonitorUrlError('Only HTTP and HTTPS monitor URLs are allowed')
  }
  if (url.username || url.password) {
    throw new UnsafeMonitorUrlError('Credentials in monitor URLs are not allowed')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new UnsafeMonitorUrlError('Monitor URLs must resolve to a public network address')
  }

  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolver(hostname)
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new UnsafeMonitorUrlError('Monitor URLs must resolve only to public network addresses')
  }

  return url
}

export async function safeMonitorFetch(
  value: string,
  init: RequestInit,
  {
    resolver = defaultResolver,
    fetcher = undiciFetch,
    followRedirects = true,
  }: {
    resolver?: Resolver
    fetcher?: typeof undiciFetch
    followRedirects?: boolean
  } = {},
): Promise<Response> {
  const dispatcher = new Agent().compose(interceptors.dns({
    lookup: async (origin, _options, callback) => {
      try {
        const hostname = typeof origin === 'string' ? origin : (origin as URL).hostname
        const addresses = await resolver(hostname)
        if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
          return callback(new UnsafeMonitorUrlError('Monitor URLs must resolve only to public network addresses'), [])
        }
        callback(null, addresses.map((address) => ({ ...address, ttl: 30_000 })))
      } catch (error) {
        callback(error as Error, [])
      }
    },
  }))
  let url = await assertSafeMonitorUrl(value, resolver)
  let request = { ...init, redirect: 'manual' as const }

  try {
    for (let redirects = 0; redirects <= 5; redirects += 1) {
      const response = await fetcher(url, { ...request, dispatcher } as any)
      if (![301, 302, 303, 307, 308].includes(response.status)) return response as unknown as Response
      if (!followRedirects) return response as unknown as Response

      const location = response.headers.get('location')
      if (!location) return response as unknown as Response
      if (redirects === 5) throw new Error('Monitor URL exceeded the redirect limit')

      const nextUrl = await assertSafeMonitorUrl(new URL(location, url).href, resolver)
      if (nextUrl.origin !== url.origin) {
        throw new UnsafeMonitorUrlError('Cross-origin redirects are not allowed for monitored requests')
      }
      if (response.status === 303) {
        request = { ...request, method: 'GET', body: undefined }
      }
      url = nextUrl
    }
  } finally {
    await dispatcher.close()
  }

  throw new Error('Monitor URL exceeded the redirect limit')
}
