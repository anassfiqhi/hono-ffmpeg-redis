import { z } from 'zod';

export const SpotifyTrackJobDataSchema = z.object({
  spotifyUrl: z.string().url(),
  outputPath: z.string(),
  uploadToS3: z.boolean().default(false)
});

export const SpotifyAlbumJobDataSchema = z.object({
  spotifyUrl: z.string().url(),
  outputDir: z.string(),
  outputPath: z.string(),
  uploadToS3: z.boolean().default(false)
});

export const SpotifyPlaylistJobDataSchema = z.object({
  spotifyUrl: z.string().url(),
  outputDir: z.string(),
  outputPath: z.string(),
  uploadToS3: z.boolean().default(false)
});

export type SpotifyTrackJobData = z.infer<typeof SpotifyTrackJobDataSchema>;
export type SpotifyAlbumJobData = z.infer<typeof SpotifyAlbumJobDataSchema>;
export type SpotifyPlaylistJobData = z.infer<typeof SpotifyPlaylistJobDataSchema>;
