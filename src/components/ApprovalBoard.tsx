'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Edit2, Save, Loader2, RefreshCcw } from 'lucide-react';

interface Draft {
  id: string;
  brief: string;
  caption: string;
  image_prompt: string;
  image_data?: string;
  n8n_resume_url: string;
  status: string;
}

export default function ApprovalBoard() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from('content_drafts')
        .select('*')
        .eq('status', 'pending');
      
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

  const handleAction = async (draft: Draft, action: 'approve' | 'regenerate') => {
    setActionLoading(draft.id);
    try {
      const response = await fetch('/api/submit-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          id: draft.id,
          caption: draft.caption,
          image_prompt: draft.image_prompt,
          n8n_resume_url: draft.n8n_resume_url 
        }),
      });

      if (response.ok) {
        // Optimistically update UI
        setDrafts(prev => prev.filter(d => d.id !== draft.id));
      } else {
        alert(`Failed to ${action} draft`);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
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
    setEditPrompt(draft.image_prompt);
  };

  const saveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_drafts')
        .update({ caption: editCaption, image_prompt: editPrompt })
        .eq('id', id);

      if (error) throw error;
      
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, caption: editCaption, image_prompt: editPrompt } : d));
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
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-4">Pending Approvals</h2>
      <div className="grid gap-6">
        {drafts.map((draft) => (
          <div key={draft.id} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden shadow-lg transition-all hover:shadow-xl hover:border-white/30">
            {/* Image Preview Area */}
            {draft.image_data && (
              <div className="w-full h-48 bg-gray-900 border-b border-white/10 relative overflow-hidden">
                <img 
                  src={draft.image_data} 
                  alt="Generated Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  Needs Review
                </span>
                <span className="text-xs text-gray-400 max-w-[200px] truncate" title={draft.brief}>
                  Brief: {draft.brief}
                </span>
              </div>

              {editingId === draft.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Caption</label>
                    <textarea 
                      className="w-full text-sm bg-black/30 border border-white/20 rounded p-2 text-white outline-none focus:border-purple-500" 
                      rows={3} 
                      value={editCaption} 
                      onChange={e => setEditCaption(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Image Prompt</label>
                    <textarea 
                      className="w-full text-sm bg-black/30 border border-white/20 rounded p-2 text-white outline-none focus:border-purple-500" 
                      rows={3} 
                      value={editPrompt} 
                      onChange={e => setEditPrompt(e.target.value)} 
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors">Cancel</button>
                    <button onClick={() => saveEdit(draft.id)} className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors flex items-center">
                      <Save className="w-4 h-4 mr-1" /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Caption</h4>
                    <p className="text-gray-100 text-sm whitespace-pre-wrap">{draft.caption}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Image Prompt</h4>
                    <p className="text-gray-300 text-sm italic border-l-2 border-purple-500 pl-3">{draft.image_prompt}</p>
                  </div>
                </div>
              )}
            </div>
            
            {!editingId && (
              <div className="bg-black/20 px-6 py-4 flex justify-between items-center border-t border-white/10 flex-wrap gap-3">
                <button 
                  onClick={() => startEditing(draft)}
                  disabled={actionLoading !== null}
                  className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </button>
                <div className="flex space-x-2 flex-wrap gap-2 md:gap-0 justify-end">
                  <button 
                    onClick={() => handleReject(draft.id)}
                    disabled={actionLoading !== null}
                    className="flex items-center px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4 mr-1" /> Reject
                  </button>
                  <button 
                    onClick={() => handleAction(draft, 'regenerate')}
                    disabled={actionLoading !== null}
                    className="flex items-center px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === draft.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-1" />}
                    Regenerate
                  </button>
                  <button 
                    onClick={() => handleAction(draft, 'approve')}
                    disabled={actionLoading !== null}
                    className="flex items-center px-3 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === draft.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
