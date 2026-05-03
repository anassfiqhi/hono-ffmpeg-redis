import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import YTMusic from 'ytmusic-api';

const execFileAsync = promisify(execFile);

let cookiesFilePath: string | null = null;

async function getCookiesFile(): Promise<string | null> {
  if (cookiesFilePath) return cookiesFilePath;
  const b64 = process.env['YOUTUBE_COOKIES_B64'];
  if (!b64) return null;
  const dir = await mkdtemp(join(tmpdir(), 'yt-cookies-'));
  const filePath = join(dir, 'cookies.txt');
  await writeFile(filePath, Buffer.from(b64, 'base64'));
  cookiesFilePath = filePath;
  return filePath;
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

export async function downloadYouTubeTrack(videoId: string, outputPath: string): Promise<void> {
  const base = outputPath.endsWith('.mp3') ? outputPath.slice(0, -4) : outputPath;
  const cookiesFile = await getCookiesFile();
  const proxy = process.env['YTDLP_PROXY'];
  const args = [
    '--extract-audio',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '0',
    '--no-playlist',
    '--js-runtimes',
    'node',
    '--extractor-args',
    'youtube:player_client=web,tv_embedded',
    ...(cookiesFile ? ['--cookies', cookiesFile] : []),
    ...(proxy ? ['--proxy', proxy] : []),
    '-o',
    `${base}.%(ext)s`,
    `https://www.youtube.com/watch?v=${videoId}`
  ];
  await execFileAsync('yt-dlp', args);
}
