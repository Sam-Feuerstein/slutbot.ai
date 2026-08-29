'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Download, ImageIcon, RefreshCw, Trash2, Upload, Video } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import LockedVideoCard from '../components/LockedVideoCard';
import { useGenerationJobs } from '../components/GenerationJobsProvider';
import { deleteAiToolGeneration } from '@/lib/actions/wavespeedImageToVideo';
import { downloadResult, removeLocalCollectionItem } from '@/lib/collectionLocal';
import {
  CURRENCY_NAME,
  DESIRE_COSTS,
  DESIRES_UPDATED_EVENT,
  formatDesireBalance,
  getAuthToken,
  getDesires,
  getGenerationDesireCost,
  getPaidDesires,
  openCheckoutInsufficient,
  refreshDesiresFromServer,
} from '@/lib/desires';
import {
  resolveVideoEngine,
  VIDEO_DURATION_DEFAULT,
  VIDEO_QUALITY_FIXED,
} from '@/lib/generation/videoOptions';
import GuestSignupOffer from '../components/GuestSignupOffer';
import VideoGenerationOptions, { videoGenerationCost } from './VideoGenerationOptions';
import { uiMediaUrl } from '@/lib/presetMedia';
import { loginHref } from '@/lib/site';
import type { ExampleVideo } from '@/lib/exampleVideos';

type Mode = 'image' | 'video';

const DEMO_VIDEO = uiMediaUrl('tool/undress-demo.mp4') || '/mock/tool/undress-demo.mp4';
const DEMO_POSTER = '/brand/tool-poster.webp';
const HOME_UPLOAD_KEY = 'slutbot-home-upload';

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

function canAutoplayMedia() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false;
  if (window.matchMedia('(max-width: 767px)').matches) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function DemoPreview({
  videoSrc,
  posterSrc,
  sourceSrc,
}: {
  videoSrc?: string;
  posterSrc: string;
  sourceSrc?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [loadVideo, setLoadVideo] = useState(false);
  const canPlayVideo = Boolean(videoSrc);

  useEffect(() => {
    if (!canPlayVideo || !canAutoplayMedia()) return;
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
  }, [canPlayVideo]);

  return (
    <div ref={rootRef} className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterSrc}
        alt=""
        width={720}
        height={900}
        decoding="async"
        className="h-full w-full object-cover object-top"
      />
      {loadVideo && videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          poster={posterSrc}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : null}
      {sourceSrc ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 w-[28%]">
          <div className="relative aspect-[80/100] w-full overflow-hidden rounded-md border-2 border-white/90 drop-shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourceSrc} alt="" className="h-full w-full object-cover object-top" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ImageToVideoClient({
  presetTitle,
  initialMode,
  demoSample,
}: {
  presetId?: string;
  presetTitle?: string;
  initialMode?: Mode;
  demoSample?: ExampleVideo;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastStartRef = useRef(0);
  const appliedResultRef = useRef<string | null>(null);
  const { jobs, activeCount, startGeneration } = useGenerationJobs();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode === 'image' || initialMode === 'video' ? initialMode : 'video');
  const [videoDuration, setVideoDuration] = useState(VIDEO_DURATION_DEFAULT);
  const [customPrompt, setCustomPrompt] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [resultKind, setResultKind] = useState<'image' | 'video' | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [resultLocked, setResultLocked] = useState(false);
  const [toolStep, setToolStep] = useState<'landing' | 'ready'>('landing');
  const [signedIn, setSignedIn] = useState(false);
  const [balance, setBalance] = useState(0);

  const resetOutput = () => {
    setResultUrl('');
    setResultKind(null);
    setResultId(null);
    setResultLocked(false);
    setError('');
  };

  const onSelectMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetOutput();
  };

  const applyFile = (file: File) => {
    resetOutput();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setToolStep('ready');
  };

  const onFileChange = (file: File | null) => {
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      setError('Use a photo (JPG, PNG, or HEIC).');
      return;
    }
    setError('');
    applyFile(file);
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
    const latest = jobs
      .filter((job) => job.phase === 'done')
      .sort((a, b) => b.startedAt - a.startedAt)[0];
    if (!latest || appliedResultRef.current === latest.localId) return;
    appliedResultRef.current = latest.localId;
    setResultUrl(latest.outputUrl || '');
    setResultKind(latest.mode);
    setResultLocked(Boolean(latest.locked));
    setResultId(latest.generationId || null);
    setError('');
  }, [jobs]);

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

  const videoEngine = resolveVideoEngine(videoDuration, VIDEO_QUALITY_FIXED);
  const videoCost = videoGenerationCost(VIDEO_QUALITY_FIXED, videoDuration);

  const onGenerate = () => {
    if (!selectedFile || !previewUrl) {
      inputRef.current?.click();
      return;
    }
    if (Date.now() - lastStartRef.current < 1000) return;

    const desireCost =
      mode === 'video'
        ? videoCost
        : getGenerationDesireCost('image', 'current', '480p');
    if (!getAuthToken()) {
      router.push(loginHref(pathname || '/ai-porn-generator'));
      return;
    }
    const available = mode === 'video' ? getPaidDesires() : getDesires();
    if (available < desireCost) {
      setError(`Not enough ${CURRENCY_NAME}. Opening packs…`);
      window.setTimeout(() => openCheckoutInsufficient(desireCost, available), 700);
      return;
    }

    lastStartRef.current = Date.now();
    setError('');
    startGeneration({
      file: selectedFile,
      previewUrl,
      mode,
      videoModel: videoEngine.videoModel,
      quality: VIDEO_QUALITY_FIXED,
      duration: videoDuration,
      customPrompt: customPrompt.trim() || undefined,
    });
  };

  const onDownloadResult = () => {
    if (!resultUrl || resultLocked) return;
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

  const demoVideoSrc = demoSample?.video || (demoSample ? undefined : DEMO_VIDEO);
  const demoPosterSrc = demoSample?.poster || DEMO_POSTER;
  const demoSourceSrc = demoSample?.source;

  const mainMedia =
    previewUrl && toolStep === 'ready' ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={previewUrl} alt="Upload preview" className="h-full w-full object-cover" />
  ) : (
    <DemoPreview videoSrc={demoVideoSrc} posterSrc={demoPosterSrc} sourceSrc={demoSourceSrc} />
  );

  return (
    <>
      <div className="w-full text-white">
        <SiteHeader />

        <main
          className={`relative mx-auto flex w-full max-w-[1600px] flex-col items-center px-3 py-5 sm:px-6 sm:py-10 ${
            activeCount > 0
              ? 'pb-[max(8.5rem,calc(var(--safe-bottom)+7rem))]'
              : 'pb-[max(1.5rem,var(--safe-bottom))]'
          }`}
        >
          <div
            className={`mt-2 w-full ${
              resultKind && (resultUrl || resultLocked)
                ? 'grid max-w-5xl items-start gap-6 lg:grid-cols-2'
                : 'flex max-w-[480px] flex-col items-stretch'
            }`}
          >
            <div className="w-full">
              <div className="rounded-2xl bg-[#1c1c1c] p-3 sm:p-4">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-black">
                  {mainMedia}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="absolute bottom-4 left-1/2 inline-flex h-10 -translate-x-1/2 items-center justify-center gap-1.5 rounded-full bg-[#ff2d78] px-4 text-[13px] font-bold leading-none text-white shadow-[0_6px_20px_rgba(255,45,120,0.5)] transition hover:bg-[#ff1a6b] hover:scale-[1.03]"
                  >
                    {toolStep === 'ready' && selectedFile ? (
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

              <div className="mt-4 inline-flex w-full rounded-full border border-white/10 bg-[#1a1a1a] p-1">
                <button
                  type="button"
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

              {!signedIn ? <div className="mt-4"><GuestSignupOffer /></div> : null}

              {mode === 'video' || (toolStep === 'ready' && selectedFile) ? (
                <div className="mt-4 w-full space-y-4">
                  {mode === 'image' ? (
                    <div>
                      <button
                        type="button"
                        disabled={!selectedFile}
                        onClick={onGenerate}
                        className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-[#ff2d78] py-3 text-sm font-extrabold text-white shadow-[0_0_20px_rgba(255,45,120,0.35)] hover:bg-[#ff1a6b] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span>
                          {activeCount > 0
                            ? `Generate another · ${DESIRE_COSTS.image} ${CURRENCY_NAME}`
                            : `Generate image · ${DESIRE_COSTS.image} ${CURRENCY_NAME}${
                                signedIn && balance < DESIRE_COSTS.image ? ' · buy credits' : ''
                              }`}
                        </span>
                        {signedIn ? (
                          <span
                            className={`text-[11px] font-semibold normal-case tracking-normal ${
                              balance >= DESIRE_COSTS.image ? 'text-white/80' : 'text-amber-200'
                            }`}
                          >
                            Your balance: {formatDesireBalance(balance)} {CURRENCY_NAME}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <VideoGenerationOptions
                        open={advancedOpen}
                        duration={videoDuration}
                        customPrompt={customPrompt}
                        onOpenChange={setAdvancedOpen}
                        onDurationChange={setVideoDuration}
                        onCustomPromptChange={setCustomPrompt}
                      />
                      <button
                        type="button"
                        disabled={!selectedFile}
                        onClick={onGenerate}
                        className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-[#ff2d78] py-3 text-sm font-extrabold tracking-wide text-white shadow-[0_0_20px_rgba(255,45,120,0.35)] hover:bg-[#ff1a6b] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span>
                          {activeCount > 0
                            ? `Generate another · ${videoCost} ${CURRENCY_NAME}`
                            : `Generate ${videoDuration}s video · ${videoCost} ${CURRENCY_NAME}${
                                signedIn && balance < videoCost ? ' · buy credits' : ''
                              }`}
                        </span>
                        {signedIn ? (
                          <span
                            className={`text-[11px] font-semibold normal-case tracking-normal ${
                              balance >= videoCost ? 'text-white/80' : 'text-amber-200'
                            }`}
                          >
                            Your balance: {formatDesireBalance(balance)} {CURRENCY_NAME}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  )}

                  {activeCount > 0 ? (
                    <p className="text-sm text-white/50">
                      Generation keeps running in the corner. Start another or browse the site.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {error ? <p className="mt-4 text-sm font-medium text-red-400">{error}</p> : null}
            </div>

            {resultKind && (resultUrl || resultLocked) ? (
              <div className="w-full space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">Result</p>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                  {resultKind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resultUrl} alt="Result" className="mx-auto max-h-[70dvh] w-full object-contain" />
                  ) : resultLocked ? (
                    <LockedVideoCard previewUrl={resultUrl} className="mx-auto max-h-[70dvh] w-full" />
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
                    onClick={() => onGenerate()}
                    disabled={!selectedFile}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#ff2d78] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff1a6b] disabled:opacity-40"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {activeCount > 0 ? 'Generate another' : 'Regenerate'}
                  </button>
                  {!resultLocked ? (
                    <button
                      type="button"
                      onClick={onDownloadResult}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  ) : null}
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
    </>
  );
}
