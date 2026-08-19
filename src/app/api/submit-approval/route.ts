import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { id, caption, image_prompt, n8n_resume_url, action = 'approve' } = await req.json();

    if (!id || !caption || !image_prompt || !n8n_resume_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Call n8n to resume execution (Phase 2)
    const n8nResponse = await fetch(n8n_resume_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        approved_caption: caption,
        approved_image_prompt: image_prompt
      }),
    });

    if (!n8nResponse.ok) {
      console.error('Failed to wake up n8n', await n8nResponse.text());
      return NextResponse.json({ error: 'Failed to resume workflow' }, { status: 502 });
    }

    // If action is regenerate, we delete the draft from the board so n8n can create a fresh one.
    // If action is approve, we mark it as approved.
    let dbError = null;
    if (action === 'regenerate') {
      const { error } = await supabase.from('content_drafts').delete().eq('id', id);
      dbError = error;
    } else {
      const { error } = await supabase
        .from('content_drafts')
        .update({ status: 'approved' })
        .eq('id', id);
      dbError = error;
    }

    if (dbError) {
      console.error('Supabase update error:', dbError);
      // Even if DB update fails, n8n was triggered successfully.
      // Might want to handle this edge case differently, but for now log it.
    }

    return NextResponse.json({ success: true, message: 'Approval sent' });
  } catch (error) {
    console.error('Error submitting approval:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
