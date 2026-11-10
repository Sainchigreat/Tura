const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

export function getYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (YOUTUBE_ID.test(value)) return value;
  try {
    const url = new URL(value);
    let id = '';
    if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    else if (url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com')) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') ?? '';
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] ?? '';
    }
    return YOUTUBE_ID.test(id) ? id : null;
  } catch { return null; }
}

export function getYouTubeEmbedUrl(input: string): string | null {
  const id = getYouTubeId(input);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null;
}
