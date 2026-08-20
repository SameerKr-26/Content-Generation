'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Edit2, Save, Loader2, RefreshCcw, Send } from 'lucide-react';

interface Draft {
  id: string;
  brief: string;
  caption: string;
  hashtags: string;
  image_prompt: string;
  image_data?: string;
  n8n_resume_url: string;
  status: string;
  image_status: string;
  text_status: string;
}

export default function ApprovalBoard() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from('content_drafts')
        .select('*')
        .neq('status', 'approved');
      
      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
    
    // Realtime subscription for new drafts
    const subscription = supabase
      .channel('drafts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_drafts' }, payload => {
        fetchDrafts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleAction = async (draft: Draft, action: string) => {
    setActionLoading(`${draft.id}-${action}`);
    try {
      const response = await fetch('/api/submit-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          id: draft.id,
          brief: draft.brief,
          caption: draft.caption,
          hashtags: draft.hashtags,
          image_prompt: draft.image_prompt,
          image_data: draft.image_data,
          n8n_resume_url: draft.n8n_resume_url 
        }),
      });

      if (response.ok) {
        if (action === 'approve_all' || action === 'reject') {
          setDrafts(prev => prev.filter(d => d.id !== draft.id));
        } else {
          // Optimistically update statuses
          setDrafts(prev => prev.map(d => {
            if (d.id === draft.id) {
              if (action === 'regenerate_image') return { ...d, image_status: 'generating' };
              if (action === 'regenerate_text') return { ...d, text_status: 'generating' };
              if (action === 'approve_image') return { ...d, image_status: 'approved' };
              if (action === 'approve_text') return { ...d, text_status: 'approved' };
            }
            return d;
          }));
        }
      } else {
        alert(`Failed to execute ${action}`);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(`${id}-reject`);
    try {
      const { error } = await supabase
        .from('content_drafts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error(error);
      alert('Failed to reject draft');
    } finally {
      setActionLoading(null);
    }
  };

  const startEditing = (draft: Draft) => {
    setEditingId(draft.id);
    setEditCaption(draft.caption);
    setEditHashtags(draft.hashtags || '');
    setEditPrompt(draft.image_prompt);
  };

  const saveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_drafts')
        .update({ caption: editCaption, hashtags: editHashtags, image_prompt: editPrompt })
        .eq('id', id);

      if (error) throw error;
      
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, caption: editCaption, hashtags: editHashtags, image_prompt: editPrompt } : d));
      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert('Failed to save edits');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 bg-white/5 rounded-xl border border-white/10">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 text-center">
        <p className="text-gray-400">No pending drafts to review.</p>
        <p className="text-sm text-gray-500 mt-2">Generate some content to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-white mb-4">Pending Approvals</h2>
      <div className="grid gap-8">
        {drafts.map((draft) => {
          const bothApproved = draft.image_status === 'approved' && draft.text_status === 'approved';
          
          return (
          <div key={draft.id} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden shadow-lg transition-all hover:shadow-xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                Needs Review
              </span>
              <span className="text-xs text-gray-400 max-w-[200px] truncate" title={draft.brief}>
                Brief: {draft.brief}
              </span>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
              
              {/* IMAGE SECTION */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    Visuals
                    {draft.image_status === 'approved' && <Check className="w-4 h-4 text-green-400 ml-2" />}
                  </h3>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleAction(draft, 'regenerate_image')}
                      disabled={draft.image_status === 'generating'}
                      className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs transition-colors"
                      title="Regenerate Image"
                    >
                      {draft.image_status === 'generating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    </button>
                    {draft.image_status !== 'approved' && (
                      <button 
                        onClick={() => handleAction(draft, 'approve_image')}
                        disabled={draft.image_status === 'generating'}
                        className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs transition-colors"
                        title="Approve Image"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {draft.image_status === 'generating' ? (
                  <div className="w-full h-48 bg-black/30 rounded flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    {draft.image_data && (
                      <div className="w-full h-48 bg-gray-900 border border-white/10 relative overflow-hidden rounded">
                        <img src={draft.image_data} alt="Generated Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-1">Image Prompt</h4>
                      {editingId === draft.id ? (
                        <textarea 
                          className="w-full text-xs bg-black/30 border border-white/20 rounded p-2 text-white outline-none focus:border-purple-500" 
                          rows={2} value={editPrompt} onChange={e => setEditPrompt(e.target.value)} 
                        />
                      ) : (
                        <p className="text-gray-300 text-xs italic border-l-2 border-purple-500 pl-2">{draft.image_prompt}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* TEXT SECTION */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    Copywriting
                    {draft.text_status === 'approved' && <Check className="w-4 h-4 text-green-400 ml-2" />}
                  </h3>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleAction(draft, 'regenerate_text')}
                      disabled={draft.text_status === 'generating'}
                      className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs transition-colors"
                      title="Regenerate Copy"
                    >
                      {draft.text_status === 'generating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    </button>
                    {draft.text_status !== 'approved' && (
                      <button 
                        onClick={() => handleAction(draft, 'approve_text')}
                        disabled={draft.text_status === 'generating'}
                        className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs transition-colors"
                        title="Approve Copy"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {draft.text_status === 'generating' ? (
                  <div className="w-full h-48 bg-black/30 rounded flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-1">Caption</h4>
                      {editingId === draft.id ? (
                        <textarea 
                          className="w-full text-sm bg-black/30 border border-white/20 rounded p-2 text-white outline-none focus:border-purple-500" 
                          rows={4} value={editCaption} onChange={e => setEditCaption(e.target.value)} 
                        />
                      ) : (
                        <p className="text-gray-100 text-sm whitespace-pre-wrap">{draft.caption}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-1">Hashtags</h4>
                      {editingId === draft.id ? (
                        <input 
                          className="w-full text-sm bg-black/30 border border-white/20 rounded p-2 text-white outline-none focus:border-purple-500" 
                          value={editHashtags} onChange={e => setEditHashtags(e.target.value)} 
                        />
                      ) : (
                        <p className="text-purple-300 text-sm">{draft.hashtags}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-black/40 px-6 py-4 flex justify-between items-center border-t border-white/10">
              <div className="flex space-x-2">
                {editingId === draft.id ? (
                  <>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors">Cancel</button>
                    <button onClick={() => saveEdit(draft.id)} className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors flex items-center">
                      <Save className="w-4 h-4 mr-1" /> Save Edits
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => startEditing(draft)}
                    className="text-gray-400 hover:text-white transition-colors flex items-center text-sm px-2 py-1 rounded hover:bg-white/5"
                  >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit Manually
                  </button>
                )}
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => handleReject(draft.id)}
                  className="flex items-center px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4 mr-1" /> Delete Entire Draft
                </button>
                
                {bothApproved && (
                  <button 
                    onClick={() => handleAction(draft, 'approve_all')}
                    disabled={actionLoading !== null}
                    className="flex items-center px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] rounded-lg text-sm font-medium transition-all"
                  >
                    {actionLoading === `${draft.id}-approve_all` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Publish Concept
                  </button>
                )}
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
