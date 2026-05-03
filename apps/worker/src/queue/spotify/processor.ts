import type { Job } from 'bullmq';
import type { JobResult } from '..';
import type { SpotifyTrackJobData, SpotifyAlbumJobData, SpotifyPlaylistJobData } from '@shared/queue/spotify/schemas';
import { mkdir } from 'fs/promises';
import { basename, join } from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { uploadToS3 } from '@worker/utils/storage';
import { fetchTrackInfo, fetchAlbumInfo, fetchPlaylistInfo, downloadYouTubeTrack } from '@worker/utils/spotify-api';

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
    const track = await fetchTrackInfo(spotifyUrl);

    const outputDir = outputPath.replace(/\/[^/]+$/, '');
    await mkdir(outputDir, { recursive: true });

    const sanitizedTitle = track.title.replace(/[/\\]/g, ' ');
    const mp3Path = join(outputDir, `${sanitizedTitle}.mp3`);
    await downloadYouTubeTrack(track.id, track.title, track.artist, mp3Path);

    if (shouldUpload) {
      const { url } = await uploadToS3(mp3Path, 'audio/mpeg', basename(mp3Path));
      return {
        success: true,
        outputUrl: url,
        metadata: { title: track.title, artist: track.artist }
      };
    }

    return {
      success: true,
      outputPath: mp3Path,
      metadata: { title: track.title, artist: track.artist }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to download Spotify track: ${errorMessage}` };
  }
}

export async function processSpotifyAlbum(job: Job<SpotifyAlbumJobData>): Promise<JobResult> {
  const { spotifyUrl, outputDir, outputPath, uploadToS3: shouldUpload } = job.data;

  try {
    const album = await fetchAlbumInfo(spotifyUrl);

    await mkdir(outputDir, { recursive: true });

    await Promise.all(
      album.tracks.map(async (track) => {
        const sanitizedTitle = track.title.replace(/[/\\]/g, ' ');
        const mp3Path = join(outputDir, `${sanitizedTitle}.mp3`);
        await downloadYouTubeTrack(track.id, track.title, album.artist, mp3Path);
      })
    );

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
    const playlist = await fetchPlaylistInfo(spotifyUrl);

    await mkdir(outputDir, { recursive: true });

    await Promise.all(
      playlist.tracks.map(async (track) => {
        const sanitizedTitle = track.title.replace(/[/\\]/g, ' ');
        const mp3Path = join(outputDir, `${sanitizedTitle}.mp3`);
        await downloadYouTubeTrack(track.id, track.title, track.artist, mp3Path);
      })
    );

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
