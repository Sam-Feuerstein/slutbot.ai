'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Download, ImageIcon, Loader2, RefreshCw, Trash2, Upload, Video } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import {
  deleteAiToolGeneration,
  pollWavespeedImageToVideo,
  refundFailedGeneration,
  saveAiToolGeneration,
  submitWavespeedImageEdit,
  submitWavespeedImageToVideo,
  uploadImageToVideoSource,
} from '@/lib/actions/wavespeedImageToVideo';
import { addLocalCollectionItem, downloadResult, removeLocalCollectionItem } from '@/lib/collectionLocal';
import {
  DESIRE_COSTS,
  DESIRES_UPDATED_EVENT,
  getAuthToken,
  getDesires,
  getGenerationDesireCost,
  openCheckoutInsufficient,
  refreshDesiresFromServer,
  setDesires,
  VIDEO_DURATION_SECONDS,
  VIDEO_OUTPUT_TIERS,
} from '@/lib/desires';
import type { VideoModel } from '@/lib/imageToVideo/types';
import { uiMediaUrl } from '@/lib/presetMedia';
import { loginHref } from '@/lib/site';

const GenerationLoadingOverlay = dynamic(() => import('./GenerationLoadingOverlay'), { ssr: false });

type Phase = 'idle' | 'uploading' | 'generating' | 'done' | 'error';
type Mode = 'image' | 'video';
type Quality = '480p' | '720p' | '1080p';

const DEMO_VIDEO = uiMediaUrl('tool/undress-demo.mp4') || '/mock/tool/undress-demo.mp4';
const DEMO_POSTER = '/brand/tool-poster.webp';
const MAX_UPLOAD_EDGE = 1920;
const HOME_UPLOAD_KEY = 'slutbot-home-upload';

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= 900 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.85);
  });
  bitmap.close();
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

function canAutoplayMedia() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false;
  if (window.matchMedia('(max-width: 767px)').matches) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function DemoVideo({ src }: { src: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [loadVideo, setLoadVideo] = useState(false);

  useEffect(() => {
    if (!canAutoplayMedia()) return;
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadVideo(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DEMO_POSTER}
        alt=""
        width={720}
        height={900}
        decoding="async"
        className="h-full w-full object-cover"
      />
      {loadVideo ? (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          poster={DEMO_POSTER}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}

export default function ImageToVideoClient({
  presetTitle,
}: {
  presetId?: string;
  presetTitle?: string;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('video');
  const [videoModel, setVideoModel] = useState<VideoModel>('current');
  const [quality, setQuality] = useState<Quality>('480p');
  const duration = VIDEO_DURATION_SECONDS;
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [resultKind, setResultKind] = useState<'image' | 'video' | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [toolStep, setToolStep] = useState<'landing' | 'ready'>('landing');
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [balance, setBalance] = useState(0);
  const generating = phase === 'uploading' || phase === 'generating';
  const selectedOutputTier =
    VIDEO_OUTPUT_TIERS.find((row) => row.quality === quality) ?? VIDEO_OUTPUT_TIERS[0];

  const resetOutput = () => {
    setResultUrl('');
    setResultKind(null);
    setResultId(null);
    setError('');
    setStatusText('');
    setPhase('idle');
  };

  const onSelectMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetOutput();
  };

  const onSelectQuality = (nextQuality: Quality) => {
    const next = VIDEO_OUTPUT_TIERS.find((row) => row.quality === nextQuality);
    if (!next) return;
    if (next.videoModel === videoModel && next.quality === quality) return;
    setVideoModel(next.videoModel);
    setQuality(next.quality);
    resetOutput();
  };

  const onFileChange = (file: File | null) => {
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      setError('Use a photo (JPG, PNG, or HEIC).');
      return;
    }
    setError('');
    setPendingFile(file);
    setConsentOpen(true);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onConsentContinue = () => {
    if (!pendingFile) return;
    resetOutput();
    setSelectedFile(pendingFile);
    setPreviewUrl(URL.createObjectURL(pendingFile));
    setPendingFile(null);
    setConsentOpen(false);
    setToolStep('ready');
  };

  const onConsentInterrupt = () => {
    setPendingFile(null);
    setConsentOpen(false);
    sessionStorage.removeItem(HOME_UPLOAD_KEY);
    if (inputRef.current) inputRef.current.value = '';
  };

  useEffect(() => {
    const syncAuth = () => {
      setSignedIn(Boolean(getAuthToken()));
      setBalance(getDesires());
    };
    syncAuth();
    void refreshDesiresFromServer().then((amount) => {
      setBalance(amount);
      setSignedIn(Boolean(getAuthToken()));
    });
    window.addEventListener(DESIRES_UPDATED_EVENT, syncAuth);
    return () => window.removeEventListener(DESIRES_UPDATED_EVENT, syncAuth);
  }, []);

  useEffect(() => {
    document.body.style.overflow = consentOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [consentOpen]);

  useEffect(() => {
    const raw = sessionStorage.getItem(HOME_UPLOAD_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { dataUrl?: string; name?: string };
      if (!saved.dataUrl) return;
      void dataUrlToFile(saved.dataUrl, saved.name || 'upload.jpg').then((file) => {
        onFileChange(file);
      });
    } catch {
      sessionStorage.removeItem(HOME_UPLOAD_KEY);
    }
  }, []);

  const pollUntilDone = useCallback(async (taskId: string) => {
    for (let i = 0; i < 120; i += 1) {
      const result = await pollWavespeedImageToVideo(taskId);
      if (typeof result.desires === 'number') {
        setDesires(result.desires);
      }
      if (result.status === 'completed' && result.outputUrl) {
        return result.outputUrl;
      }
      if (result.status === 'failed' || result.status === 'cancelled' || result.status === 'timeout') {
        throw new Error(result.error || 'Generation failed.');
      }
      setStatusText(result.status === 'processing' ? 'Generating...' : 'Queued...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error('Timed out waiting for the result.');
  }, []);

  const onGenerate = async () => {
    if (!selectedFile) {
      inputRef.current?.click();
      return;
    }

    const desireCost = getGenerationDesireCost(mode, videoModel, quality);
    if (!getAuthToken()) {
      router.push(loginHref(pathname || '/ai-porn-generator'));
      return;
    }
    if (getDesires() < desireCost) {
      setError('Not enough Slutcoins. Opening packs…');
      window.setTimeout(() => openCheckoutInsufficient(desireCost, getDesires()), 700);
      return;
    }

    setError('');
    setResultUrl('');
    setResultKind(null);
    setResultId(null);
    setPhase('uploading');
    setStatusText('Uploading image...');

    let taskId = '';
    try {
      const fd = new FormData();
      fd.set('file', await compressImageForUpload(selectedFile));
      const upload = await uploadImageToVideoSource(fd);
      if (upload.error || !upload.key) throw new Error(upload.error || 'Upload failed.');

      setPhase('generating');
      setStatusText('Starting generation...');
      const submit =
        mode === 'image'
          ? await submitWavespeedImageEdit(upload.key)
          : await submitWavespeedImageToVideo(
              upload.key,
              undefined,
              quality,
              duration,
              'tuned',
              videoModel,
            );
      if (typeof submit.desires === 'number') setDesires(submit.desires);
      if (submit.error || !submit.taskId) throw new Error(submit.error || 'Submit failed.');
      taskId = submit.taskId;

      const url = await pollUntilDone(submit.taskId);
      setResultUrl(url);
      setResultKind(mode);
      setPhase('done');
      setStatusText('Done.');

      const saved = await saveAiToolGeneration({
        mode,
        videoModel: mode === 'video' ? videoModel : null,
        sourceKey: upload.key,
        outputUrl: url,
        quality: mode === 'video' ? quality : '',
        duration: mode === 'video' ? duration : null,
      });
      const id = saved.id || `local-${Date.now()}`;
      setResultId(id);
      addLocalCollectionItem({
        id,
        mode,
        videoModel: mode === 'video' ? videoModel : null,
        sourceImageUrl: upload.key,
        outputUrl: url,
        prompt: '',
        quality: mode === 'video' ? quality : '',
        duration: mode === 'video' ? duration : null,
        createdAt: new Date().toISOString(),
      });
    } catch (e: unknown) {
      if (taskId) {
        const refunded = await refundFailedGeneration(taskId);
        if (typeof refunded.desires === 'number') setDesires(refunded.desires);
      } else {
        await refreshDesiresFromServer();
      }
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const onDownloadResult = () => {
    if (!resultUrl) return;
    const ext = resultKind === 'video' ? 'mp4' : 'jpg';
    void downloadResult(resultUrl, `slutbot-${resultKind || 'result'}.${ext}`);
  };

  const onDeleteResult = async () => {
    if (resultId && !resultId.startsWith('local-')) {
      await deleteAiToolGeneration(resultId);
    }
    if (resultId) removeLocalCollectionItem(resultId, resultUrl);
    resetOutput();
  };

  const mainMedia =
    previewUrl && toolStep === 'ready' ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={previewUrl} alt="Upload preview" className="h-full w-full object-cover" />
  ) : (
    <DemoVideo src={DEMO_VIDEO} />
  );

  return (
    <>
      {generating && previewUrl ? (
        <GenerationLoadingOverlay
          imageUrl={previewUrl}
          mode={mode}
          phase={phase === 'uploading' ? 'uploading' : 'generating'}
          videoModel={videoModel}
        />
      ) : null}

      <div className="w-full text-white">
        <SiteHeader />

        <main className="relative mx-auto flex w-full max-w-[1600px] flex-col items-center px-3 py-5 pb-[max(1.5rem,var(--safe-bottom))] sm:px-6 sm:py-10">
          <div className="inline-flex w-full max-w-[420px] rounded-full border border-white/10 bg-[#1a1a1a] p-1">
            <button
              type="button"
              disabled={generating}
              onClick={() => onSelectMode('video')}
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold transition-colors sm:px-5 ${
                mode === 'video'
                  ? 'bg-[#2a2a2a] text-[#ff2d78]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Video className="h-4 w-4" />
              Video
              <span className="rounded-md bg-[#ff2d78] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                New
              </span>
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={() => onSelectMode('image')}
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold transition-colors sm:px-5 ${
                mode === 'image'
                  ? 'bg-[#2a2a2a] text-[#ff2d78]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              Image
            </button>
          </div>

          <div
            className={`mt-6 w-full ${
              resultUrl
                ? 'grid max-w-5xl items-start gap-6 lg:grid-cols-2'
                : 'flex max-w-[420px] flex-col items-stretch'
            }`}
          >
            <div className="w-full">
              <div className="rounded-2xl bg-[#1c1c1c] p-3 sm:p-4">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-black">
                  {mainMedia}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => inputRef.current?.click()}
                    className="absolute bottom-4 left-1/2 inline-flex h-10 -translate-x-1/2 items-center justify-center gap-1.5 rounded-full bg-[#ff2d78] px-4 text-[13px] font-bold leading-none text-white shadow-[0_6px_20px_rgba(255,45,120,0.5)] transition hover:bg-[#ff1a6b] hover:scale-[1.03] disabled:opacity-60"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {statusText || 'Working...'}
                      </>
                    ) : toolStep === 'ready' && selectedFile ? (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Change image
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Choose image
                      </>
                    )}
                  </button>

                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              {mode === 'video' || (toolStep === 'ready' && selectedFile) ? (
                <div className="mt-6 w-full space-y-4">
                  {mode === 'image' ? (
                    <div>
                      <button
                        type="button"
                        disabled={generating || !selectedFile}
                        onClick={() => void onGenerate()}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff2d78] py-3.5 text-sm font-extrabold text-white shadow-[0_0_20px_rgba(255,45,120,0.35)] hover:bg-[#ff1a6b] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {statusText || 'Working...'}
                          </>
                        ) : (
                          `Generate image · ${DESIRE_COSTS.image} Slutcoins${
                            signedIn && balance < DESIRE_COSTS.image ? ' · buy credits' : ''
                          }`
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="relative block">
                        <span className="sr-only">Video quality</span>
                        <select
                          disabled={generating}
                          value={selectedOutputTier.quality}
                          onChange={(event) => onSelectQuality(event.target.value as Quality)}
                          className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#1c1c1c] py-2 pl-4 pr-10 text-sm font-bold text-white outline-none transition hover:border-white/20 focus:border-[#ff2d78] disabled:opacity-50"
                        >
                          {VIDEO_OUTPUT_TIERS.map((tier) => (
                            <option key={tier.id} value={tier.quality} className="bg-[#1c1c1c] text-white">
                              {tier.label} · {tier.hint} · {tier.cost} Slutcoins
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                      </label>
                      <button
                        type="button"
                        disabled={generating || !selectedFile}
                        onClick={() => void onGenerate()}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff2d78] py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[0_0_20px_rgba(255,45,120,0.35)] hover:bg-[#ff1a6b] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {statusText || 'Working...'}
                          </>
                        ) : (
                          'GENERATE VIDEO'
                        )}
                      </button>
                    </div>
                  )}

                  {selectedFile ? (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="text-sm font-semibold text-[#ff2d78] hover:underline"
                    >
                      Change image
                    </button>
                  ) : null}
                </div>
              ) : null}

              {error ? <p className="mt-4 text-sm font-medium text-red-400">{error}</p> : null}
            </div>

            {resultUrl ? (
              <div className="w-full space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">Result</p>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                  {resultKind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resultUrl} alt="Result" className="mx-auto max-h-[70dvh] w-full object-contain" />
                  ) : (
                    <video
                      src={resultUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="mx-auto max-h-[70dvh] w-full bg-black"
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void onGenerate()}
                    disabled={generating || !selectedFile}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#ff2d78] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff1a6b] disabled:opacity-40"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={onDownloadResult}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteResult()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {consentOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/75 sm:backdrop-blur-sm"
            onClick={onConsentInterrupt}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-title"
            className="relative w-full max-w-md rounded-t-2xl border border-white/10 bg-[#161616] p-6 pb-[max(1.5rem,var(--safe-bottom))] shadow-2xl sm:rounded-2xl sm:p-7"
          >
            <h2 id="consent-title" className="text-xl font-black tracking-tight text-white">
              I hereby certify
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              I have the rights to use and modify this photo. I am the subject or have the subject&apos;s
              explicit consent. I understand the image is for my private viewing only and won&apos;t be
              published.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onConsentContinue}
                className="min-h-12 rounded-xl bg-[#ff2d78] px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_0_20px_rgba(255,45,120,0.35)] transition-colors hover:bg-[#ff1a6b]"
              >
                Yes continue
              </button>
              <button
                type="button"
                onClick={onConsentInterrupt}
                className="min-h-12 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                No interrupt
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
