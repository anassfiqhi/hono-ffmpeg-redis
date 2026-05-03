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
import { processSpotifyJob } from '~/utils/job-handler';

export function registerSpotifyRoutes(app: OpenAPIHono) {
  app.openapi(spotifyTrackRoute, async (c) => {
    try {
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

      return c.redirect(result.outputUrl, 302);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });

  app.openapi(spotifyTrackUrlRoute, async (c) => {
    try {
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
        outputExtension: 'zip',
        uploadToS3: true
      });

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      if (!result.outputUrl) {
        return c.json({ error: 'Download failed' }, 400);
      }

      return c.redirect(result.outputUrl, 302);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });

  app.openapi(spotifyAlbumUrlRoute, async (c) => {
    try {
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
        outputExtension: 'zip',
        uploadToS3: true
      });

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      if (!result.outputUrl) {
        return c.json({ error: 'Download failed' }, 400);
      }

      return c.redirect(result.outputUrl, 302);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'Processing failed', message: errorMessage }, 500);
    }
  });

  app.openapi(spotifyPlaylistUrlRoute, async (c) => {
    try {
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
