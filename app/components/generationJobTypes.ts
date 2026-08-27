import type { VideoModel } from '@/lib/imageToVideo/types';

export type TrackedGenerationPhase = 'uploading' | 'generating' | 'done' | 'error';

export type TrackedGeneration = {
  localId: string;
  taskId: string;
  mode: 'image' | 'video';
  videoModel: VideoModel | null;
  quality: string;
  duration: number | null;
  previewUrl: string;
  sourceKey: string;
  startedAt: number;
  generatingAt: number | null;
  phase: TrackedGenerationPhase;
  statusText: string;
  error?: string;
  outputUrl?: string;
  locked?: boolean;
  generationId?: string;
  seen?: boolean;
};

export type StartGenerationInput = {
  file: File;
  previewUrl: string;
  mode: 'image' | 'video';
  videoModel: VideoModel;
  quality: string;
  duration?: number;
};
