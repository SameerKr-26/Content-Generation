import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.GITHUB_ACCESS_TOKEN;
    if (!token) {
      console.warn('GITHUB_ACCESS_TOKEN is not set. Simulating empty gallery for now.');
      return NextResponse.json({ assets: [] });
    }

    // Assuming the user's repository is SameerKr-26/Content-Generation
    // and images are pushed to 'images' folder.
    const owner = 'SameerKr-26';
    const repo = 'Content-Generation';
    
    // Fetch images folder contents
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/images`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Folder might not exist yet
        return NextResponse.json({ assets: [] });
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter only image files and map to ContentAsset format
    const assets = data
      .filter((file: any) => file.type === 'file' && file.name.match(/\.(png|jpg|jpeg|gif)$/i))
      .map((file: any) => ({
        name: file.name,
        imageUrl: file.download_url,
        // Since captions are stored separately, we'd ideally fetch them too,
        // but for now we'll just link a placeholder or similar logic.
        // A complete implementation might fetch the text files from 'captions' folder.
        captionUrl: `https://raw.githubusercontent.com/${owner}/${repo}/main/captions/cap_${file.name.replace('img_', '').replace('.png', '.txt')}`
      }));

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}
