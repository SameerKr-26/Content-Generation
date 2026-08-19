'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

export default function GeneratorForm() {
  const [brief, setBrief] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/trigger-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });

      if (response.ok) {
        setMessage('Draft triggered successfully! Waiting for n8n...');
        setBrief('');
      } else {
        setMessage('Failed to trigger workflow.');
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
      <h2 className="text-2xl font-semibold mb-4 text-white">Generate Content</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="brief" className="block text-sm font-medium text-gray-200 mb-2">
            Content Brief
          </label>
          <textarea
            id="brief"
            rows={4}
            className="w-full rounded-lg bg-black/20 border border-white/20 p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
            placeholder="e.g., Post about web development best practices..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting || !brief.trim()}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-6 rounded-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Drafting...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Generate Draft</span>
            </>
          )}
        </button>
      </form>
      
      {message && (
        <p className="mt-4 text-sm text-center text-purple-200 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
