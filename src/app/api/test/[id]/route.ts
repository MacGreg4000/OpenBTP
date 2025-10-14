import { NextResponse } from 'next/server'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  console.log('API Test route with params called:', params);
  return NextResponse.json({ 
    message: 'Test API avec paramètres fonctionne!',
    params: params
  })
} 