import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // n8n is expected to send { caption, image_prompt, resume_url, brief }
    // Wait, the prompt says: "Send the Gemini JSON output PLUS the expression {{ $execution.resumeUrl }}"
    // It should also ideally include the original brief so we know what it was for.
    
    const { caption, image_prompt, resumeUrl, brief, image_data } = data;

    if (!caption || !image_prompt || !resumeUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('content_drafts')
      .insert([
        {
          brief: brief || 'Unknown brief',
          caption,
          image_prompt,
          image_data,
          n8n_resume_url: resumeUrl,
          status: 'pending'
        }
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Draft saved successfully' });
  } catch (error) {
    console.error('Error in catch-draft:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
