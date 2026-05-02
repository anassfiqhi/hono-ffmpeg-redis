import type { Job } from 'bullmq';
import type { JobResult } from '..';
import type { SpotifyTrackJobData, SpotifyAlbumJobData, SpotifyPlaylistJobData } from '@shared/queue/spotify/schemas';
import type { Track, Album, Playlist } from 'spottydl-better';
import { mkdir } from 'fs/promises';
import { basename, join } from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { uploadToS3 } from '@worker/utils/storage';

async function zipDirectory(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

export async function processSpotifyTrack(job: Job<SpotifyTrackJobData>): Promise<JobResult> {
  const { spotifyUrl, outputPath, uploadToS3: shouldUpload } = job.data;

  try {
    const { getTrack, downloadTrack } = await import('spottydl-better');

    const trackOrError = await getTrack(spotifyUrl);
    if (typeof trackOrError === 'string') {
      return { success: false, error: `Failed to get track info: ${trackOrError}` };
    }
    const track = trackOrError as Track;

    const outputDir = outputPath.replace(/\/[^/]+$/, '');
    await mkdir(outputDir, { recursive: true });

    const results = await downloadTrack(track, outputDir);

    if (typeof results === 'string') {
      return { success: false, error: `Download failed: ${results}` };
    }

    const succeeded = results.filter((r) => r.status === 'Success');
    if (succeeded.length === 0) {
      return { success: false, error: 'Track download failed' };
    }

    const downloadedFile = join(outputDir, succeeded[0]!.filename);

    if (shouldUpload) {
      const { url } = await uploadToS3(downloadedFile, 'audio/mpeg', basename(downloadedFile));
      return {
        success: true,
        outputUrl: url,
        metadata: { title: track.title, artist: track.artist, album: track.album }
      };
    }

    return {
      success: true,
      outputPath: downloadedFile,
      metadata: { title: track.title, artist: track.artist, album: track.album }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to download Spotify track: ${errorMessage}` };
  }
}

export async function processSpotifyAlbum(job: Job<SpotifyAlbumJobData>): Promise<JobResult> {
  const { spotifyUrl, outputDir, outputPath, uploadToS3: shouldUpload } = job.data;

  try {
    const { getAlbum, downloadAlbum } = await import('spottydl-better');

    const albumOrError = await getAlbum(spotifyUrl);
    if (typeof albumOrError === 'string') {
      return { success: false, error: `Failed to get album info: ${albumOrError}` };
    }
    const album = albumOrError as Album;

    await mkdir(outputDir, { recursive: true });

    const results = await downloadAlbum(album, outputDir, true);
    if (typeof results === 'string') {
      return { success: false, error: `Download failed: ${results}` };
    }

    await zipDirectory(outputDir, outputPath);

    if (shouldUpload) {
      const zipName = `${album.name}.zip`.replace(/[/\\?%*:|"<>]/g, '_');
      const { url } = await uploadToS3(outputPath, 'application/zip', zipName);
      return {
        success: true,
        outputUrl: url,
        metadata: { album: album.name, artist: album.artist }
      };
    }

    return {
      success: true,
      outputPath,
      metadata: { album: album.name, artist: album.artist }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to download Spotify album: ${errorMessage}` };
  }
}

export async function processSpotifyPlaylist(job: Job<SpotifyPlaylistJobData>): Promise<JobResult> {
  const { spotifyUrl, outputDir, outputPath, uploadToS3: shouldUpload } = job.data;

  try {
    const { getPlaylist, downloadPlaylist } = await import('spottydl-better');

    const playlistOrError = await getPlaylist(spotifyUrl);
    if (typeof playlistOrError === 'string') {
      return { success: false, error: `Failed to get playlist info: ${playlistOrError}` };
    }
    const playlist = playlistOrError as Playlist;

    await mkdir(outputDir, { recursive: true });

    const results = await downloadPlaylist(playlist, outputDir);
    if (typeof results === 'string') {
      return { success: false, error: `Download failed: ${results}` };
    }

    await zipDirectory(outputDir, outputPath);

    if (shouldUpload) {
      const zipName = `${playlist.name}.zip`.replace(/[/\\?%*:|"<>]/g, '_');
      const { url } = await uploadToS3(outputPath, 'application/zip', zipName);
      return {
        success: true,
        outputUrl: url,
        metadata: { playlist: playlist.name, owner: playlist.owner }
      };
    }

    return {
      success: true,
      outputPath,
      metadata: { playlist: playlist.name, owner: playlist.owner }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to download Spotify playlist: ${errorMessage}` };
  }
}
