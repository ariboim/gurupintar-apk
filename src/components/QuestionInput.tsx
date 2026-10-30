import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
  Sparkles,
  Send,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  SwitchCamera,
  Smartphone,
  Zap,
  ZapOff,
  RefreshCw,
} from 'lucide-react';

interface QuestionInputProps {
  onAnalyze: (data: {
    prompt: string;
    imageBase64?: string;
    mimeType?: string;
    driveUrl?: string;
    fase: string;
    mataPelajaran: string;
  }) => void;
  isLoading: boolean;
  tokens: number;
  onOpenTopup: () => void;
}

const SAMPLE_QUESTIONS = [
  {
    fase: 'Fase B (Kelas 3-4 SD)',
    mataPelajaran: 'Matematika',
    label: '🍰 Soal Cerita Pecahan Bolu (Kelas 4)',
    text: 'Ibu memiliki 1 kue bolu yang dipotong menjadi 8 bagian sama besar. Kakak memakan 3 potong dan Adik memakan 2 potong. Berapa bagian sisa kue bolu Ibu sekarang?',
  },
  {
    fase: 'Fase B (Kelas 3-4 SD)',
    mataPelajaran: 'IPAS (Ilmu Pengetahuan Alam & Sosial)',
    label: '🌿 Proses Fotosintesis & Daur Hidup (Kelas 4)',
    text: 'Jelaskan mengapa tumbuhan hijau membutuhkan sinar matahari untuk fotosintesis, dan apa saja zat yang dihasilkan dari proses tersebut?',
  },
  {
    fase: 'Fase C (Kelas 5-6 SD)',
    mataPelajaran: 'Matematika',
    label: '📦 Volume Balok & Liter Air (Kelas 5)',
    text: 'Sebuah bak mandi berbentuk balok berukuran panjang 80 cm, lebar 50 cm, dan tinggi 60 cm. Jika bak baru terisi 3/4 bagian, berapa liter air yang ada di dalam bak?',
  },
  {
    fase: 'Fase A (Kelas 1-2 SD)',
    mataPelajaran: 'Bahasa Indonesia',
    label: '📖 Kalimat Ajakan & Perintah (Kelas 2)',
    text: 'Apa perbedaan kalimat ajakan dan kalimat perintah? Berikan masing-masing 1 contoh kalimat yang sopan untuk teman sekelas!',
  },
];

export const QuestionInput: React.FC<QuestionInputProps> = ({
  onAnalyze,
  isLoading,
  tokens,
  onOpenTopup,
}) => {
  const [promptText, setPromptText] = useState('');
  const [fase, setFase] = useState('Fase B (Kelas 3-4 SD)');
  const [mataPelajaran, setMataPelajaran] = useState('Matematika');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [isRecording, setIsRecording] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Google Drive state
  const [isDriveInputOpen, setIsDriveInputOpen] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [activeDriveUrl, setActiveDriveUrl] = useState<string | null>(null);
  const [isResolvingDrive, setIsResolvingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveMeta, setDriveMeta] = useState<{
    fileId: string;
    mimeType: string;
    previewUrl?: string;
    textContent?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Selected sample question state & visual scroll highlight
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [isHighlightQuestion, setIsHighlightQuestion] = useState(false);

  // Keep videoRef.srcObject synced whenever stream or camera state updates
  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStream) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Video playback warning:', err);
      });
    }
  }, [isCameraActive, cameraStream]);

  // Clean up any open camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // File Upload Handler (Gallery or File Picker)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      // Clear Drive if user uploaded a file directly
      setActiveDriveUrl(null);
      setDriveMeta(null);
    };
    reader.readAsDataURL(file);
    // Reset file input value so selecting the same photo again triggers change
    e.target.value = '';
  };

  // Launch Native Device Camera (capture="environment")
  const handleNativeCameraLaunch = () => {
    setShowCameraMenu(false);
    stopCamera();
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.value = '';
      nativeCameraInputRef.current.click();
    }
  };

  // Live Camera capture (In-Browser Viewfinder)
  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setShowCameraMenu(false);
    setIsCameraLoading(true);
    setCameraError(null);
    setIsCameraActive(true);

    // Stop previous tracks if switching
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setIsTorchOn(false);

    let stream: MediaStream | null = null;
    try {
      // Step 1: Request high resolution with requested facingMode
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    } catch (err1) {
      console.warn('High-res facingMode camera failed, trying flexible facing mode...', err1);
      try {
        // Step 2: Flexible facing mode
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
        });
      } catch (err2) {
        console.warn('Flexible facingMode failed, falling back to any video device...', err2);
        try {
          // Step 3: Any available video device
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err3) {
          console.error('All camera attempts failed:', err3);
          setIsCameraActive(false);
          setIsCameraLoading(false);

          // Graceful fallback to native device camera so student is never stuck!
          if (nativeCameraInputRef.current) {
            nativeCameraInputRef.current.value = '';
            nativeCameraInputRef.current.click();
          }
          alert(
            'Pratinjau kamera web terhalang atau tidak didukung di browser ini.\n\nKak Bintang otomatis membuka Kamera Bawaan HP Anda agar bisa langsung foto PR!'
          );
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      setCameraStream(stream);
      setIsCameraLoading(false);

      // Immediately connect to video element if already rendered
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Check if device supports torch/flashlight
      const track = stream.getVideoTracks()[0];
      if (track && 'getCapabilities' in track) {
        try {
          const capabilities = (track as any).getCapabilities?.() || {};
          setHasTorch(Boolean(capabilities.torch));
        } catch {
          setHasTorch(false);
        }
      }
    }
  };

  const toggleFacingMode = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      } catch (err) {
        console.warn('Torch toggle failed', err);
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual camera shutter flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (cameraFacingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setImagePreview(dataUrl);
      setImageMime('image/jpeg');
      setActiveDriveUrl(null);
      setDriveMeta(null);
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setIsCameraActive(false);
    setIsTorchOn(false);
    setIsCameraLoading(false);
    setCameraError(null);
  };

  // Google Drive Link Resolver
  const handleResolveDriveLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = driveUrlInput.trim();
    if (!url) return;

    setIsResolvingDrive(true);
    setDriveError(null);

    try {
      const res = await fetch('/api/resolve-drive-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveUrl: url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat link Google Drive.');
      }

      setActiveDriveUrl(url);
      setDriveMeta({
        fileId: data.fileId,
        mimeType: data.mimeType,
        previewUrl: data.previewUrl,
        textContent: data.textContent,
      });

      if (data.previewUrl) {
        setImagePreview(data.previewUrl);
        setImageMime(data.mimeType);
      }

      setIsDriveInputOpen(false);
      setDriveUrlInput('');
    } catch (err: any) {
      setDriveError(err.message || 'Terjadi kesalahan saat memeriksa Google Drive.');
    } finally {
      setIsResolvingDrive(false);
    }
  };

  const handleClearDrive = () => {
    setActiveDriveUrl(null);
    setDriveMeta(null);
    setImagePreview(null);
    setDriveError(null);
  };

  // Voice Dictation
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Fitur rekam suara belum didukung di browser ini. Silakan ketik soal ya.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPromptText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleApplySample = (sample: (typeof SAMPLE_QUESTIONS)[0]) => {
    setSelectedSample(sample.label);
    setPromptText(sample.text);
    setFase(sample.fase);
    setMataPelajaran(sample.mataPelajaran);
    setImagePreview(null);
    setActiveDriveUrl(null);
    setDriveMeta(null);

    // Visual feedback highlight on the question box
    setIsHighlightQuestion(true);
    setTimeout(() => {
      setIsHighlightQuestion(false);
    }, 2000);

    // Direct and smooth scroll directly to the question input textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        textareaRef.current.focus();
        const textLen = sample.text.length;
        textareaRef.current.setSelectionRange(textLen, textLen);
      }
    }, 60);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() && !imagePreview && !activeDriveUrl) return;

    if (tokens <= 0) {
      onOpenTopup();
      return;
    }

    onAnalyze({
      prompt: promptText.trim(),
      imageBase64: imagePreview || undefined,
      mimeType: imageMime,
      driveUrl: activeDriveUrl || undefined,
      fase,
      mataPelajaran,
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-7 shadow-lg border-2 border-amber-200/80">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Curriculumn Phase & Subject Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-amber-950 mb-1.5 flex items-center gap-1">
              <span>Kurikulum & Jenjang Kelas</span>
              <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full font-semibold">
                Kurikulum Merdeka
              </span>
            </label>
            <select
              value={fase}
              onChange={(e) => setFase(e.target.value)}
              className="w-full bg-amber-50/50 border-2 border-amber-200 rounded-2xl px-3.5 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="Fase A (Kelas 1-2 SD)">Fase A (Kelas 1-2 SD) - Pengenalan Konsep Dasar</option>
              <option value="Fase B (Kelas 3-4 SD)">Fase B (Kelas 3-4 SD) - Pemahaman Logika & Nalar</option>
              <option value="Fase C (Kelas 5-6 SD)">Fase C (Kelas 5-6 SD) - Analisis & Soal Cerita Kritis</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-950 mb-1.5">
              Mata Pelajaran
            </label>
            <select
              value={mataPelajaran}
              onChange={(e) => setMataPelajaran(e.target.value)}
              className="w-full bg-amber-50/50 border-2 border-amber-200 rounded-2xl px-3.5 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="Matematika">Matematika SD (Hitung & Nalar)</option>
              <option value="IPAS (Ilmu Pengetahuan Alam & Sosial)">IPAS (Sains, Alam & Lingkungan Sosial)</option>
              <option value="Bahasa Indonesia">Bahasa Indonesia (Membaca, Menulis & Kosakata)</option>
              <option value="Pendidikan Pancasila">Pendidikan Pancasila (PPKn)</option>
              <option value="Bahasa Inggris">Bahasa Inggris SD</option>
            </select>
          </div>
        </div>

        {/* Camera Selection Modal */}
        {showCameraMenu && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border-2 border-amber-300 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Pilih Metode Kamera</h4>
                    <p className="text-[11px] text-slate-500">Foto soal dari lembar buku PR</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCameraMenu(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleNativeCameraLaunch}
                  className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-3 group active:scale-98"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">Kamera HP (Bawaan)</span>
                      <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                        Paling Stabil
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Buka kamera ponsel langsung. Hasil foto beresolusi tinggi, jernih, dan auto-fokus.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-amber-50/60 border-2 border-slate-200 hover:border-amber-300 transition-all cursor-pointer flex items-center gap-3 group active:scale-98"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-amber-100 text-slate-700 group-hover:text-amber-800 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs text-slate-900">Kamera Live di Layar</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Pratinjau langsung di layar peramban dengan panduan kotak bidik PR.
                    </p>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowCameraMenu(false)}
                className="w-full py-2 rounded-xl text-center text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Live Camera Viewfinder if Active */}
        {isCameraActive && (
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-amber-400 shadow-xl flex flex-col animate-fade-in">
            {/* Visual flash effect overlay */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white z-40 animate-ping opacity-90 pointer-events-none" />
            )}

            {/* Viewfinder Header */}
            <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/40 text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {cameraFacingMode === 'environment' ? 'Kamera Belakang (Foto PR)' : 'Kamera Depan'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                      isTorchOn
                        ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 font-bold'
                        : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                    title={isTorchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
                  >
                    {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer shadow-xs active:rotate-180 duration-200"
                  title="Putar Kamera (Depan / Belakang)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md transition-all cursor-pointer"
                  title="Tutup Kamera"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Screen & Target Scanner Frame */}
            <div className="relative aspect-[4/3] sm:aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              {isCameraLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 text-amber-300 p-6 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs font-bold">Menyiapkan kamera Anda...</p>
                </div>
              ) : (
                <>
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && cameraStream && el.srcObject !== cameraStream) {
                        el.srcObject = cameraStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />

                  {/* Scanner Guidelines Frame */}
                  <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl" />
                      <div className="w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr" />
                    </div>
                    <div className="text-center">
                      <span className="inline-block px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-amber-200 text-[11px] font-semibold">
                        Arahkan kamera ke lembar/soal PR Anda
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl" />
                      <div className="w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Viewfinder Bar with Capture & Native Camera Option */}
            <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleNativeCameraLaunch}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-xs"
                title="Beralih ke aplikasi kamera bawaan HP untuk foto beresolusi penuh"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs">Kamera HP (Bawaan)</span>
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                disabled={isCameraLoading}
                onClick={capturePhoto}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/30 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer ring-4 ring-amber-400/30 disabled:opacity-50"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <Camera className="w-4 h-4" />
                <span>Ambil Foto</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Active Google Drive Linked Card */}
        {activeDriveUrl && (
          <div className="rounded-2xl border-2 border-blue-400 bg-blue-50/70 p-3.5 flex items-center justify-between gap-3 animate-fade-in shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white border border-blue-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                {driveMeta?.previewUrl ? (
                  <img
                    src={driveMeta.previewUrl}
                    alt="Preview Drive"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <svg viewBox="0 0 87.3 78" className="w-6 h-6">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Google Drive Terhubung
                  </span>
                  <span className="text-[11px] text-blue-800 font-mono font-medium truncate max-w-[150px] sm:max-w-[200px]">
                    ID: {driveMeta?.fileId.slice(0, 10)}...
                  </span>
                </div>
                <p className="text-xs text-blue-950 font-semibold truncate mt-0.5 max-w-sm">
                  {activeDriveUrl}
                </p>
                <p className="text-[11px] text-blue-700/80">
                  {driveMeta?.previewUrl
                    ? 'Foto lembar PR berhasil terbaca dari Google Drive.'
                    : 'Dokumen teks PR berhasil terbaca dari Google Drive.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearDrive}
              className="p-1.5 rounded-full bg-blue-100 hover:bg-rose-100 text-blue-700 hover:text-rose-700 transition-colors cursor-pointer"
              title="Lepas Link Google Drive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Regular Uploaded Image Preview Box (if not drive) */}
        {imagePreview && !activeDriveUrl && (
          <div className="relative rounded-2xl border-2 border-amber-300 p-2.5 bg-amber-50/70 flex items-center justify-between gap-3 animate-fade-in shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-300 bg-white flex-shrink-0 shadow-xs">
                <img
                  src={imagePreview}
                  alt="Foto Soal PR"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-bold text-amber-950 flex items-center gap-1.5 truncate">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Foto Lembar PR Terlampir</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                    Siap Dibahas
                  </span>
                </p>
                <p className="text-[11px] text-amber-800/80 truncate mt-0.5">
                  Kak Bintang akan membaca tulisan dan gambar soal pada lembar PR ini secara otomatis.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCameraMenu(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-200/80 hover:bg-amber-300 active:bg-orange-500 active:text-white text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Foto Ulang Soal PR"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline text-[11px]">Foto Ulang</span>
              </button>

              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="p-1.5 rounded-full bg-rose-100 hover:bg-rose-200 active:bg-rose-500 active:text-white text-rose-700 transition-colors cursor-pointer"
                title="Hapus Foto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Google Drive Link Input Drawer */}
        {isDriveInputOpen && (
          <div className="p-4 rounded-2xl border-2 border-blue-300 bg-blue-50/50 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg viewBox="0 0 87.3 78" className="w-5 h-5">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                </div>
                <h5 className="font-bold text-xs md:text-sm text-blue-950">
                  Masukkan Link Google Drive (Foto Soal / Dokumen)
                </h5>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDriveInputOpen(false);
                  setDriveError(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={driveUrlInput}
                  onChange={(e) => setDriveUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-blue-200 bg-white focus:border-blue-500 focus:outline-none text-xs font-medium"
                />
              </div>
              <button
                type="button"
                onClick={handleResolveDriveLink}
                disabled={isResolvingDrive || !driveUrlInput.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isResolvingDrive ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memeriksa...</span>
                  </>
                ) : (
                  <>
                    <span>Hubungkan</span>
                  </>
                )}
              </button>
            </div>

            {driveError && (
              <div className="flex items-start gap-1.5 text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{driveError}</span>
              </div>
            )}

            <div className="text-[11px] text-blue-900/70 bg-white/70 p-2.5 rounded-xl border border-blue-100 flex items-start gap-2">
              <span className="font-bold text-blue-700">💡 Panduan Cepat:</span>
              <span>
                Di Google Drive, klik <strong>Bagikan (Share)</strong> pada foto PR &rarr; ubah Akses Umum menjadi <strong>"Siapa saja yang memiliki link"</strong> &rarr; Salin link dan tempel di atas.
              </span>
            </div>
          </div>
        )}

        {/* Active Sample Question banner if selected */}
        {selectedSample && (
          <div className="flex items-center justify-between gap-2 text-xs px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 text-orange-950 font-semibold mb-2 shadow-xs transition-all">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
              <span className="truncate">
                Soal Terpilih: <strong className="text-orange-900">{selectedSample}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSample(null);
                setPromptText('');
              }}
              className="text-[11px] text-orange-600 hover:text-orange-800 font-bold underline cursor-pointer flex-shrink-0 active:scale-95 ml-1"
            >
              Ganti
            </button>
          </div>
        )}

        {/* Dedicated card containing textarea + bottom action toolbar (NEVER overlapping text) */}
        <div
          className={`rounded-2xl border-2 transition-all duration-300 bg-white overflow-hidden shadow-xs flex flex-col ${
            isHighlightQuestion
              ? 'border-orange-500 ring-4 ring-orange-300/80 bg-orange-50/20'
              : 'border-amber-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200'
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={4}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Tuliskan catatan soal PR atau foto bukumu di sini... Contoh: 'Bantu nomor 3 ya Kak Bintang, tentang cara menghitung luas persegi panjang jika diketahui...'"
            className="w-full px-4 pt-3.5 pb-2.5 text-xs md:text-sm font-medium leading-relaxed placeholder:text-slate-400 focus:outline-none resize-none bg-transparent min-h-[95px]"
          />

          {/* Quick Input Actions dedicated toolbar row - NEVER overlaps text */}
          <div className="px-3 py-2 bg-amber-50/80 border-t border-amber-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Upload photo button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Native device camera input (works 100% reliably on all smartphones) */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200 active:bg-orange-500 active:text-white active:scale-95 text-amber-900 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Unggah Foto PR dari Galeri / Dokumen"
              >
                <Upload className="w-3.5 h-3.5 text-amber-700" />
                <span className="inline text-[11px] sm:text-xs">Unggah Foto</span>
              </button>

              {/* Camera snap */}
              <button
                type="button"
                onClick={() => setShowCameraMenu(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200 active:bg-orange-500 active:text-white active:scale-95 text-amber-900 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Foto Buku / Soal PR dengan Kamera"
              >
                <Camera className="w-3.5 h-3.5 text-amber-700" />
                <span className="inline text-[11px] sm:text-xs">Kamera</span>
              </button>

              {/* Google Drive Link Toggle Button */}
              <button
                type="button"
                onClick={() => setIsDriveInputOpen((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  activeDriveUrl
                    ? 'bg-blue-600 text-white font-bold active:bg-blue-800'
                    : isDriveInputOpen
                    ? 'bg-blue-100 text-blue-900 border border-blue-300 active:bg-blue-600 active:text-white'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 active:bg-blue-600 active:text-white'
                }`}
                title="Tautkan Link Google Drive Foto/Dokumen PR"
              >
                <svg viewBox="0 0 87.3 78" className="w-3.5 h-3.5 flex-shrink-0">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
                <span className="text-[11px] sm:text-xs">Drive</span>
              </button>

              {/* Voice recognition */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse active:bg-rose-700'
                    : 'bg-amber-100 hover:bg-amber-200 active:bg-orange-500 active:text-white text-amber-900'
                }`}
                title="Bicara Soal PR (Dikte Suara Bahasa Indonesia)"
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-700" />}
                <span className="inline text-[11px] sm:text-xs">
                  {isRecording ? 'Mendengarkan...' : 'Dikte'}
                </span>
              </button>
            </div>

            {/* Token cost badge */}
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-xs">
              <span>Biaya: 1 Token</span>
            </div>
          </div>
        </div>

        {/* Submit Button & Token Warning */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-500 font-medium">
            💡 Jawaban Kak Bintang tuntas dengan logika nalar, papan tulis digital & audio narasi.
          </div>

          <button
            type="submit"
            disabled={isLoading || (!promptText.trim() && !imagePreview && !activeDriveUrl)}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm md:text-base shadow-lg shadow-amber-200 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:from-orange-600 active:to-orange-700 active:ring-4 active:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Menganalisis Cepat... (Maks. 10 Detik)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Bahas PR Bersama Kak Bintang</span>
                <Send className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Sample Questions Pills */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-1 text-xs font-bold text-slate-600 mb-2.5">
            <div className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Belum ada foto PR? Coba klik contoh soal berikut:</span>
            </div>
            {selectedSample && (
              <span className="text-[11px] text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                👆 Langsung diarahkan ke kotak soal
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_QUESTIONS.map((s, idx) => {
              const isSelected = selectedSample === s.label;
              const isOrangeTheme = idx % 2 === 0;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySample(s)}
                  className={`text-left text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 shadow-xs active:scale-95 active:shadow-inner ${
                    isSelected
                      ? isOrangeTheme
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-2 border-orange-600 shadow-md shadow-orange-200 ring-2 ring-orange-300 font-bold scale-[1.01]'
                        : 'bg-gradient-to-r from-blue-600 to-sky-500 text-white border-2 border-blue-700 shadow-md shadow-blue-200 ring-2 ring-blue-300 font-bold scale-[1.01]'
                      : isOrangeTheme
                      ? 'bg-orange-50/70 hover:bg-orange-100 text-orange-950 border border-orange-200 hover:border-orange-400 active:bg-orange-500 active:text-white active:border-orange-600 active:ring-2 active:ring-orange-300'
                      : 'bg-blue-50/70 hover:bg-blue-100 text-blue-950 border border-blue-200 hover:border-blue-400 active:bg-blue-600 active:text-white active:border-blue-700 active:ring-2 active:ring-blue-300'
                  }`}
                  title={`Klik untuk mencoba soal: ${s.label}`}
                >
                  <span className="leading-snug break-words flex-1">{s.label}</span>
                  {isSelected ? (
                    <span className="text-[10px] bg-white text-slate-900 font-extrabold px-2 py-0.5 rounded-md shadow-xs flex-shrink-0 ml-1">
                      ✓ Terpilih
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ml-1 transition-colors ${
                        isOrangeTheme
                          ? 'text-orange-700 bg-orange-100/90'
                          : 'text-blue-700 bg-blue-100/90'
                      }`}
                    >
                      Pilih &rarr;
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </div>
  );
};
