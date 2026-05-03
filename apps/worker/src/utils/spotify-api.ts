import { spawn } from 'child_process';
import ytdl from '@distube/ytdl-core';
import playdl from 'play-dl';
import YTMusic from 'ytmusic-api';

function spawnFfmpegFromStream(readable: NodeJS.ReadableStream, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-i', 'pipe:0', '-vn', '-acodec', 'libmp3lame', '-q:a', '0', '-y', outputPath]);
    readable.pipe(ff.stdin);
    readable.on('error', reject);
    ff.stdin.on('error', () => {
      /* swallow broken pipe */
    });
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
    ff.on('error', reject);
  });
}

async function tryYouTube(videoId: string, outputPath: string): Promise<void> {
  const audioStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
    quality: 'highestaudio',
    filter: 'audioonly'
  });
  await spawnFfmpegFromStream(audioStream, outputPath);
}

async function trySoundCloud(title: string, artist: string, outputPath: string): Promise<void> {
  const results = await playdl.search(`${title} ${artist}`, { source: { soundcloud: 'tracks' }, limit: 1 });
  const first = results[0];
  if (!first) throw new Error(`No SoundCloud results for: ${title} - ${artist}`);
  const stream = await playdl.stream(first.url);
  await spawnFfmpegFromStream(stream.stream, outputPath);
}

// Scrapes track/album/playlist metadata from Spotify's embed page (__NEXT_DATA__).
// No API keys required.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpotifyEntity = Record<string, any>;

async function fetchEmbedEntity(type: string, id: string): Promise<SpotifyEntity> {
  const res = await fetch(`https://open.spotify.com/embed/${type}/${id}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`Spotify embed fetch failed: ${res.status}`);
  const html = await res.text();

  const match = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!match) throw new Error('Spotify embed page missing __NEXT_DATA__');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = JSON.parse(match[1] as string) as any;
  const entity = data?.props?.pageProps?.state?.data?.entity as SpotifyEntity | undefined;
  if (!entity) throw new Error('Spotify embed __NEXT_DATA__ missing entity');
  return entity;
}

function parseSpotifyId(url: string): { type: string; id: string } {
  const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
  if (!match) throw new Error(`Invalid Spotify URL: ${url}`);
  return { type: match[1] as string, id: match[2] as string };
}

function largestImage(images: { url: string; maxHeight?: number }[]): string {
  if (!images.length) return '';
  return [...images].sort((a, b) => (b.maxHeight ?? 0) - (a.maxHeight ?? 0))[0]?.url ?? '';
}

let ytmInstance: InstanceType<typeof YTMusic> | null = null;
async function ytMusicSearch(query: string): Promise<string> {
  if (!ytmInstance) {
    ytmInstance = new YTMusic();
    await ytmInstance.initialize();
  }
  const results = await ytmInstance.searchSongs(query);
  if (!results.length) throw new Error(`No YouTube Music results for: ${query}`);
  return (results[0] as { videoId: string }).videoId;
}

export interface TrackInfo {
  title: string;
  artist: string;
  year: string;
  album: string;
  id: string;
  albumCoverURL: string;
  trackNumber: number;
}

export interface AlbumInfo {
  name: string;
  artist: string;
  year: string;
  albumCoverURL: string;
  tracks: { title: string; id: string; trackNumber: number }[];
}

export interface PlaylistInfo {
  name: string;
  owner: string;
  description: string;
  playlistCoverURL: string;
  tracks: {
    title: string;
    artist: string;
    album: string;
    id: string;
    albumCoverURL: string;
    trackNumber: number;
  }[];
}

export async function fetchTrackInfo(url: string): Promise<TrackInfo> {
  const { id } = parseSpotifyId(url);
  const e = await fetchEmbedEntity('track', id);

  const title = String(e['name'] ?? e['title'] ?? '');
  const rawArtists = e['artists'] as { name: string }[] | undefined;
  const artist =
    rawArtists && rawArtists.length > 0 ? rawArtists.map((a) => a.name).join(', ') : String(e['subtitle'] ?? '');
  const year = String(e['releaseDate']?.isoString ?? '').slice(0, 4);
  const images = (e['visualIdentity']?.image ?? []) as { url: string; maxHeight: number }[];
  const albumCoverURL = largestImage(images);
  const ytId = await ytMusicSearch(`${title} - ${artist}`);

  return { title, artist, year, album: '', albumCoverURL, id: ytId, trackNumber: 1 };
}

export async function fetchAlbumInfo(url: string): Promise<AlbumInfo> {
  const { id } = parseSpotifyId(url);
  const e = await fetchEmbedEntity('album', id);

  const name = String(e['name'] ?? e['title'] ?? '');
  const artist = String(e['subtitle'] ?? '');
  const releaseDate = e['releaseDate'];
  const year = String(releaseDate?.isoString ?? releaseDate ?? '').slice(0, 4);
  const images = (e['visualIdentity']?.image ?? []) as { url: string; maxHeight: number }[];
  const albumCoverURL = largestImage(images);
  const trackList = (e['trackList'] ?? []) as { title: string; subtitle: string }[];

  const tracks = await Promise.all(
    trackList.map(async (t, i) => {
      const ytId = await ytMusicSearch(`${t.title} - ${t.subtitle || artist}`);
      return { title: t.title, id: ytId, trackNumber: i + 1 };
    })
  );

  return { name, artist, year, albumCoverURL, tracks };
}

export async function fetchPlaylistInfo(url: string): Promise<PlaylistInfo> {
  const { id } = parseSpotifyId(url);
  const e = await fetchEmbedEntity('playlist', id);

  const name = String(e['name'] ?? e['title'] ?? '');
  const owner = String(e['subtitle'] ?? '');
  const description = String(e['description'] ?? '');
  const coverArt = e['coverArt'] as { sources: { url: string }[] } | undefined;
  const visualImages = (e['visualIdentity']?.image ?? []) as { url: string }[];
  const playlistCoverURL = coverArt?.sources[0]?.url ?? visualImages[0]?.url ?? '';
  const trackList = (e['trackList'] ?? []) as { title: string; subtitle: string }[];

  const tracks = await Promise.all(
    trackList.map(async (t, i) => {
      const ytId = await ytMusicSearch(`${t.title} - ${t.subtitle}`);
      return {
        title: t.title,
        artist: t.subtitle,
        album: '',
        id: ytId,
        albumCoverURL: '',
        trackNumber: i + 1
      };
    })
  );

  return { name, owner, description, playlistCoverURL, tracks };
}

export async function downloadYouTubeTrack(
  videoId: string,
  title: string,
  artist: string,
  outputPath: string
): Promise<void> {
  try {
    await tryYouTube(videoId, outputPath);
  } catch {
    await trySoundCloud(title, artist, outputPath);
  }
}
