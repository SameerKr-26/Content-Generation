import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { id, brief, caption, hashtags, image_prompt, image_data, n8n_resume_url, action } = await req.json();

    if (!id || !n8n_resume_url || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Call n8n to resume execution (Phase 2 or Loop)
    const n8nResponse = await fetch(n8n_resume_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        id, // Pass ID so n8n knows which draft to update
        brief,
        caption,
        hashtags,
        image_prompt,
        image_data
      }),
    });

    if (!n8nResponse.ok) {
      console.error('Failed to wake up n8n', await n8nResponse.text());
      return NextResponse.json({ error: 'Failed to resume workflow' }, { status: 502 });
    }

    // Update the statuses based on the action
    let dbError = null;
    let updates: any = {};

    if (action === 'regenerate_image') {
      updates.image_status = 'generating';
    } else if (action === 'regenerate_text') {
      updates.text_status = 'generating';
    } else if (action === 'approve_image') {
      updates.image_status = 'approved';
    } else if (action === 'approve_text') {
      updates.text_status = 'approved';
    } else if (action === 'approve_all') {
      updates.image_status = 'approved';
      updates.text_status = 'approved';
      updates.status = 'approved'; // overall status
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('content_drafts')
        .update(updates)
        .eq('id', id);
      dbError = error;
    }

    if (dbError) {
      console.error('Supabase update error:', dbError);
    }

    return NextResponse.json({ success: true, message: 'Approval/Action sent' });
  } catch (error) {
    console.error('Error submitting approval:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
