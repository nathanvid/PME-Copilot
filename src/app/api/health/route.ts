import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  const start = Date.now()

  const duration = Date.now() - start
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
      responseTimeMs: duration,
    },
    {
      status: 200,
      headers: { 'x-response-time': duration.toString() },
    }
  )
}
