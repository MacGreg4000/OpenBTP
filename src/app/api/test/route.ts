import { NextResponse } from 'next/server'

export async function GET() {
  console.log('API Test route called')  // Pour voir dans la console du serveur
  return new NextResponse('API is working', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
} 