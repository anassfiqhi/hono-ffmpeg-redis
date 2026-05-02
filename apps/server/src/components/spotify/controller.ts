import type { OpenAPIHono } from '@hono/zod-openapi';
import {
  spotifyTrackRoute,
  spotifyTrackUrlRoute,
  spotifyAlbumRoute,
  spotifyAlbumUrlRoute,
  spotifyPlaylistRoute,
  spotifyPlaylistUrlRoute
} from './schemas';
import { JobType } from '~/queue';
import { env } from '~/config/env';
import { processSpotifyJob } from '~/utils/job-handler';

export function registerSpotifyRoutes(app: OpenAPIHono) {
  app.openapi(spotifyTrackRoute, async (c) => {
    try {
      const { url } = c.req.valid('json');

      const result = await processSpotifyJob({
        spotifyUrl: url,
        jobType: JobType.SPOTIFY_TRACK,
        outputExtension: 'mp3'
      });

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      if (!result.outputBuffer) {
        return c.json({ error: 'Download failed' }, 400);
      }

      const meta = result.metadata ?? {};
      const title = typeof meta['title'] === 'string' ? meta['title'] : 'track';
      const filename = `${title}.mp3`.replace(/[/\\?%*:|"<>]/g, '_');

      return c.body(new Uint8Array(result.outputBuffer), 200, {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });

  app.openapi(spotifyTrackUrlRoute, async (c) => {
    try {
      if (env.STORAGE_MODE !== 's3') {
        return c.json({ error: 'S3 mode not enabled' }, 400);
      }

      const { url } = c.req.valid('json');

      const result = await processSpotifyJob({
        spotifyUrl: url,
        jobType: JobType.SPOTIFY_TRACK,
        outputExtension: 'mp3',
        uploadToS3: true
      });

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      if (!result.outputUrl) {
        return c.json({ error: 'Download failed' }, 400);
      }

      return c.json({ url: result.outputUrl }, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });

  app.openapi(spotifyAlbumRoute, async (c) => {
    try {
      const { url } = c.req.valid('json');

      const result = await processSpotifyJob({
        spotifyUrl: url,
        jobType: JobType.SPOTIFY_ALBUM,
        outputExtension: 'zip'
      });

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      if (!result.outputBuffer) {
        return c.json({ error: 'Download failed' }, 400);
      }

      const meta = result.metadata ?? {};
      const album = typeof meta['album'] === 'string' ? meta['album'] : 'album';
      const filename = `${album}.zip`.replace(/[/\\?%*:|"<>]/g, '_');

      return c.body(new Uint8Array(result.outputBuffer), 200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });

  app.openapi(spotifyAlbumUrlRoute, async (c) => {
    try {
      if (env.STORAGE_MODE !== 's3') {
        return c.json({ error: 'S3 mode not enabled' }, 400);
      }

      const { url } = c.req.valid('json');

      const result = await processSpotifyJob({
        spotifyUrl: url,
        jobType: JobType.SPOTIFY_ALBUM,
        outputExtension: 'zip',
        uploadToS3: true
      });

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      if (!result.outputUrl) {
        return c.json({ error: 'Download failed' }, 400);
      }

      return c.json({ url: result.outputUrl }, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });

  app.openapi(spotifyPlaylistRoute, async (c) => {
    try {
      const { url } = c.req.valid('json');

      const result = await processSpotifyJob({
        spotifyUrl: url,
        jobType: JobType.SPOTIFY_PLAYLIST,
        outputExtension: 'zip'
      });

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      if (!result.outputBuffer) {
        return c.json({ error: 'Download failed' }, 400);
      }

      const meta = result.metadata ?? {};
      const playlist = typeof meta['playlist'] === 'string' ? meta['playlist'] : 'playlist';
      const filename = `${playlist}.zip`.replace(/[/\\?%*:|"<>]/g, '_');

      return c.body(new Uint8Array(result.outputBuffer), 200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });

  app.openapi(spotifyPlaylistUrlRoute, async (c) => {
    try {
      if (env.STORAGE_MODE !== 's3') {
        return c.json({ error: 'S3 mode not enabled' }, 400);
      }

      const { url } = c.req.valid('json');

      const result = await processSpotifyJob({
        spotifyUrl: url,
        jobType: JobType.SPOTIFY_PLAYLIST,
        outputExtension: 'zip',
        uploadToS3: true
      });

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      if (!result.outputUrl) {
        return c.json({ error: 'Download failed' }, 400);
      }

      return c.json({ url: result.outputUrl }, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });
}
