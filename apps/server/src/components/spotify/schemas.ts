import { createRoute, z } from '@hono/zod-openapi';
import { ErrorSchema, UrlResponseSchema } from '~/utils/schemas';

const SpotifyUrlBodySchema = z.object({
  url: z.string().url().openapi({
    example: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    description: 'Spotify URL (track, album, or playlist)'
  })
});

const SpotifyTrackResponseSchema = z
  .object({
    title: z.string(),
    artist: z.string(),
    album: z.string().optional(),
    year: z.string().optional()
  })
  .openapi('SpotifyTrackMeta');

export const spotifyTrackRoute = createRoute({
  method: 'post',
  path: '/spotify/track',
  tags: ['Spotify'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SpotifyUrlBodySchema
        }
      },
      required: true
    }
  },
  responses: {
    200: {
      content: {
        'audio/mpeg': {
          schema: z.string().openapi({ type: 'string', format: 'binary' })
        }
      },
      description: 'Spotify track downloaded as MP3'
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid Spotify URL'
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Download failed'
    }
  }
});

export const spotifyTrackUrlRoute = createRoute({
  method: 'post',
  path: '/spotify/track/url',
  tags: ['Spotify'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SpotifyUrlBodySchema
        }
      },
      required: true
    }
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UrlResponseSchema } },
      description: 'Spotify track downloaded and uploaded to S3'
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid Spotify URL or S3 mode not enabled'
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Download failed'
    }
  }
});

export const spotifyAlbumRoute = createRoute({
  method: 'post',
  path: '/spotify/album',
  tags: ['Spotify'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SpotifyUrlBodySchema
        }
      },
      required: true
    }
  },
  responses: {
    200: {
      content: {
        'application/zip': {
          schema: z.string().openapi({ type: 'string', format: 'binary' })
        }
      },
      description: 'Spotify album downloaded as ZIP of MP3 files'
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid Spotify URL'
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Download failed'
    }
  }
});

export const spotifyAlbumUrlRoute = createRoute({
  method: 'post',
  path: '/spotify/album/url',
  tags: ['Spotify'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SpotifyUrlBodySchema
        }
      },
      required: true
    }
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UrlResponseSchema } },
      description: 'Spotify album downloaded and uploaded to S3 as ZIP'
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid Spotify URL or S3 mode not enabled'
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Download failed'
    }
  }
});

export const spotifyPlaylistRoute = createRoute({
  method: 'post',
  path: '/spotify/playlist',
  tags: ['Spotify'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SpotifyUrlBodySchema
        }
      },
      required: true
    }
  },
  responses: {
    200: {
      content: {
        'application/zip': {
          schema: z.string().openapi({ type: 'string', format: 'binary' })
        }
      },
      description: 'Spotify playlist downloaded as ZIP of MP3 files'
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid Spotify URL'
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Download failed'
    }
  }
});

export const spotifyPlaylistUrlRoute = createRoute({
  method: 'post',
  path: '/spotify/playlist/url',
  tags: ['Spotify'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SpotifyUrlBodySchema
        }
      },
      required: true
    }
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UrlResponseSchema } },
      description: 'Spotify playlist downloaded and uploaded to S3 as ZIP'
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid Spotify URL or S3 mode not enabled'
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Download failed'
    }
  }
});

export { SpotifyTrackResponseSchema };
