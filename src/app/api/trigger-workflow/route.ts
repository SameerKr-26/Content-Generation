import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { brief } = await req.json();

    if (!brief) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_START_WEBHOOK;
    if (!webhookUrl) {
      console.error('N8N_START_WEBHOOK is not defined');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Call n8n webhook (Phase 1)
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
    });

    if (!n8nResponse.ok) {
      console.error('Failed to trigger n8n', await n8nResponse.text());
      return NextResponse.json({ error: 'Failed to trigger workflow' }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Workflow triggered' });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
