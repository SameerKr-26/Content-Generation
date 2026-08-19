'use client';

import { useState, useEffect } from 'react';
import { Download, Image as ImageIcon, Copy, CheckCircle2 } from 'lucide-react';

interface ContentAsset {
  name: string;
  imageUrl: string;
  captionUrl: string;
}

export default function ContentGallery() {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);

  useEffect(() => {
    // In a real scenario, this would fetch from a custom Next.js API route 
    // that securely uses the GITHUB_ACCESS_TOKEN to list repository contents.
    // We are simulating fetching the gallery here.
    const fetchGallery = async () => {
      try {
        const response = await fetch('/api/gallery');
        if (response.ok) {
          const data = await response.json();
          setAssets(data.assets || []);
        }
      } catch (error) {
        console.error('Failed to fetch gallery', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, []);

  const handleDownload = async (imageUrl: string, captionText: string, assetName: string) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a local download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = assetName || 'social_post.png';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Copy caption to clipboard
      await navigator.clipboard.writeText(captionText);
      setCopiedCaption(assetName);
      setTimeout(() => setCopiedCaption(null), 3000);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 bg-white/5 rounded-xl border border-white/10">
        <div className="animate-pulse flex flex-col items-center">
          <ImageIcon className="w-8 h-8 text-white/30 mb-2" />
          <span className="text-sm text-gray-400">Loading Gallery...</span>
        </div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 text-center">
        <ImageIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-gray-400">No generated content yet.</p>
        <p className="text-sm text-gray-500 mt-1">Approved drafts will appear here once n8n completes generation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-4">Content Gallery</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assets.map((asset, idx) => (
          <div key={idx} className="bg-black/40 rounded-xl overflow-hidden border border-white/10 group hover:border-white/20 transition-all">
            <div className="aspect-square relative overflow-hidden bg-gray-900">
              {/* Using standard img tag because URLs might be external from GitHub raw */}
              <img 
                src={asset.imageUrl} 
                alt="Generated Content" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <button
                  onClick={() => handleDownload(asset.imageUrl, 'Sample caption', asset.name)}
                  className="w-full bg-white text-black py-2 rounded-lg font-medium flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  {copiedCaption === asset.name ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                      Downloaded & Copied
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Assets
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
