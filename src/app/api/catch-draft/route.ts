import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // id is provided if n8n is updating an existing draft (e.g., after regeneration)
    const { id, caption, hashtags, image_prompt, resumeUrl, brief, image_data, image_status = 'pending', text_status = 'pending' } = data;

    if (!resumeUrl) {
      return NextResponse.json({ error: 'Missing resumeUrl' }, { status: 400 });
    }

    if (id) {
      // Build update object dynamically to avoid overwriting with undefined
      const updates: any = {
        n8n_resume_url: resumeUrl,
        image_status,
        text_status
      };
      if (caption !== undefined) updates.caption = caption;
      if (hashtags !== undefined) updates.hashtags = hashtags;
      if (image_prompt !== undefined) updates.image_prompt = image_prompt;
      if (image_data !== undefined) updates.image_data = image_data;

      const { error } = await supabase
        .from('content_drafts')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Supabase update error:', error);
        return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
      }
    } else {
      // Insert new draft
      const { error } = await supabase
        .from('content_drafts')
        .insert([
          {
            brief: brief || 'Unknown brief',
            caption: caption || '',
            hashtags: hashtags || '',
            image_prompt: image_prompt || '',
            image_data,
            n8n_resume_url: resumeUrl,
            image_status,
            text_status,
            status: 'pending' // Still keeping this as a global fallback
          }
        ]);

      if (error) {
        console.error('Supabase insert error:', error);
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Draft saved successfully' });
  } catch (error) {
    console.error('Error in catch-draft:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
