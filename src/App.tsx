import React, { useState, useEffect } from 'react';
import {
  TanyaGuruResult,
  SoalHistoryItem,
  TokenTransaction,
  StudentUser,
} from './types';
import { safeFetchJson, getLocalStudents, saveLocalStudents } from './utils/studentSync';
import { Header } from './components/Header';
import { KakBintangAvatar } from './components/KakBintangAvatar';
import { QuestionInput } from './components/QuestionInput';
import { AudioNarasiPlayer } from './components/AudioNarasiPlayer';
import { PapanTulisDigital } from './components/PapanTulisDigital';
import { TipsJuaraCard } from './components/TipsJuaraCard';
import { SoalLatihanSection } from './components/SoalLatihanSection';
import { MayarTopupModal } from './components/MayarTopupModal';
import { RiwayatBelajarModal } from './components/RiwayatBelajarModal';
import { ParentGuideModal } from './components/ParentGuideModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { StudentAuthModal } from './components/StudentAuthModal';
import {
  Sparkles,
  BookOpen,
  ArrowDown,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Coins,
  Smile,
  ShieldCheck,
  GraduationCap,
  Heart,
  Share2,
  AlertTriangle,
  MessageCircle,
  Phone,
  Shield,
  Lock,
  Music,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChimeSound } from './utils/speech';
import { startSoftAnalysisBgm, stopSoftAnalysisBgm, setBgmMuted } from './utils/backgroundMusic';

export default function App() {
  // Tokens state
  const [tokens, setTokens] = useState<number>(() => {
    const saved = localStorage.getItem('tanya_guru_tokens');
    return saved !== null ? parseInt(saved, 10) : 5; // 5 free tokens on initial start
  });

  // History state
  const [history, setHistory] = useState<SoalHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('tanya_guru_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Transactions state
  const [transactions, setTransactions] = useState<TokenTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('tanya_guru_transactions');
      if (saved) return JSON.parse(saved);
      return [
        {
          id: 'init-bonus',
          timestamp: Date.now(),
          description: 'Bonus Pendaftaran Awal (Akun Google)',
          amount: 5,
          balanceAfter: 5,
          type: 'bonus',
        },
      ];
    } catch {
      return [];
    }
  });

  // Current active analysis result
  const [currentResult, setCurrentResult] = useState<TanyaGuruResult | null>(null);
  const [activeQuestionMeta, setActiveQuestionMeta] = useState<{
    prompt?: string;
    imageBase64?: string;
    driveUrl?: string;
    fase: string;
    mataPelajaran: string;
  } | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedData, setLastSubmittedData] = useState<{
    prompt: string;
    imageBase64?: string;
    mimeType?: string;
    driveUrl?: string;
    fase: string;
    mataPelajaran: string;
  } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userRole, setUserRole] = useState<'siswa' | 'orangtua'>('siswa');
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isParentGuideModalOpen, setIsParentGuideModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isStudentAuthOpen, setIsStudentAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [analysisElapsed, setAnalysisElapsed] = useState(0);
  const [isBgmSilent, setIsBgmSilent] = useState(false);

  // 10-Second Analysis Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if (isLoading) {
      setAnalysisElapsed(0);
      timer = setInterval(() => {
        setAnalysisElapsed((prev) => {
          if (prev >= 10) return 10;
          return +(prev + 0.1).toFixed(1);
        });
      }, 100);
    } else {
      setAnalysisElapsed(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  // Student Profile & Authentication State
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(() => {
    try {
      const saved = localStorage.getItem('tanya_guru_student');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isStudentBlocked, setIsStudentBlocked] = useState(false);

  const userEmail = currentStudent?.email || 'bca.ccpl@gmail.com';

  // Check URL hash for direct admin dashboard navigation (#admin)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#admin') {
        setIsAdminModalOpen(true);
      }
      const handleHash = () => {
        if (window.location.hash === '#admin') {
          setIsAdminModalOpen(true);
        }
      };
      window.addEventListener('hashchange', handleHash);
      return () => window.removeEventListener('hashchange', handleHash);
    }
  }, []);

  // Save student profile
  useEffect(() => {
    if (currentStudent) {
      localStorage.setItem('tanya_guru_student', JSON.stringify(currentStudent));
      setIsStudentBlocked(currentStudent.status === 'diblokir');
    } else {
      localStorage.removeItem('tanya_guru_student');
      setIsStudentBlocked(false);
    }
  }, [currentStudent]);

  // Periodic student status & token balance check with server (updates live when admin changes tokens/blocks)
  useEffect(() => {
    if (!currentStudent) return;

    const checkStudentStatus = async () => {
      try {
        const res = await fetch(`/api/student/status?studentId=${currentStudent.id}`);
        if (res.status === 403) {
          setIsStudentBlocked(true);
          setCurrentStudent((prev) => (prev ? { ...prev, status: 'diblokir' } : null));
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.student) {
            const updated: StudentUser = data.student;
            if (updated.status !== currentStudent.status || updated.tokens !== currentStudent.tokens) {
              setCurrentStudent(updated);
              setIsStudentBlocked(updated.status === 'diblokir');
              setTokens(updated.tokens);
            }
          }
        }
      } catch {
        // Silent check
      }
    };

    const interval = setInterval(checkStudentStatus, 4000);
    return () => clearInterval(interval);
  }, [currentStudent]);

  // Save tokens and transactions
  useEffect(() => {
    localStorage.setItem('tanya_guru_tokens', tokens.toString());
  }, [tokens]);

  useEffect(() => {
    localStorage.setItem('tanya_guru_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('tanya_guru_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Show temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Add tokens via Mayar or Voucher
  const handleAddTokens = (
    amount: number,
    description: string,
    type: 'mayar_topup' | 'voucher'
  ) => {
    const newBal = tokens + amount;
    setTokens(newBal);
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        timestamp: Date.now(),
        description,
        amount,
        balanceAfter: newBal,
        type,
      },
      ...prev,
    ]);
    showToast(`🎉 Sukses! +${amount} Token telah masuk ke akunmu.`);
  };

  // 1. Otomatis deteksi ketika kembali dari link pembayaran Mayar (?payment=success / ?status=paid)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment') || params.get('status') || params.get('paid');

    if (paymentStatus === 'success' || paymentStatus === 'paid' || paymentStatus === 'true') {
      const tokenCount = parseInt(params.get('tokens') || '30', 10);
      handleAddTokens(
        tokenCount,
        `Top-up Mayar Otomatis: mayar.to/indo-digital (+${tokenCount} Token)`,
        'mayar_topup'
      );
      playChimeSound('success');
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // 2. Otomatis cek webhook Mayar di server (polling setiap 3,5 detik saat tab aktif)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await safeFetchJson<any>('/api/check-payment-status');
        if (res.ok && res.data?.hasPaid && res.data?.payment) {
          const awarded = res.data.payment.tokens || 30;
          handleAddTokens(
            awarded,
            `Top-up Mayar Otomatis (Rp ${Number(res.data.payment.amount).toLocaleString('id-ID')} via mayar.to/indo-digital)`,
            'mayar_topup'
          );
          playChimeSound('success');
          confetti({ particleCount: 120, spread: 85, origin: { y: 0.6 } });
          setIsTopupModalOpen(false);
          showToast(`🎉 Pembayaran Mayar berhasil! +${awarded} Token telah ditambahkan otomatis ke saldo belajarmu.`);
        }
      } catch (e) {
        // Silent background check
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [tokens]);

  // Student Login Success & Logout handlers
  const handleStudentLoginSuccess = (
    student: StudentUser,
    welcomeGreeting?: { title: string; sentToEmail: string; message: string; freeTokens: number }
  ) => {
    setCurrentStudent(student);
    setTokens(student.tokens);
    setIsStudentBlocked(student.status === 'diblokir');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tanya_guru_student_updated', { detail: student }));
      localStorage.setItem('tanya_guru_sync_time', Date.now().toString());
    }

    if (welcomeGreeting) {
      setTransactions((prev) => [
        {
          id: `tx-welcome-${Date.now()}`,
          timestamp: Date.now(),
          description: `Bonus Registrasi Siswa Baru (${student.email})`,
          amount: welcomeGreeting.freeTokens,
          balanceAfter: student.tokens,
          type: 'bonus',
        },
        ...prev,
      ]);
      showToast(`🎉 Selamat datang, ${student.name}! +${welcomeGreeting.freeTokens} Token Gratis aktif.`);
    } else {
      showToast(`Selamat datang kembali, ${student.name}!`);
    }
  };

  const handleStudentLogout = () => {
    setCurrentStudent(null);
    setIsStudentBlocked(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tanya_guru_student_updated', { detail: null }));
      localStorage.setItem('tanya_guru_sync_time', Date.now().toString());
    }
    showToast('Anda telah keluar dari akun siswa.');
  };

  // Consume 1 token upon successful PR answer
  const deductTokenForAnalysis = async (topic: string) => {
    const newBal = Math.max(0, tokens - 1);
    setTokens(newBal);

    if (currentStudent) {
      setCurrentStudent((prev) => (prev ? { ...prev, tokens: newBal } : null));

      // Mirror token deduction in local storage
      const localList = getLocalStudents();
      const idx = localList.findIndex((s) => s.id === currentStudent.id);
      if (idx !== -1) {
        localList[idx].tokens = newBal;
        saveLocalStudents(localList);
      }

      try {
        await safeFetchJson('/api/student/consume-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: currentStudent.id, amount: 1 }),
        });
      } catch {
        // Ignore network glitch
      }
    }

    setTransactions((prev) => [
      {
        id: `usage-${Date.now()}`,
        timestamp: Date.now(),
        description: `Analisis Soal PR: ${topic.slice(0, 32)}...`,
        amount: -1,
        balanceAfter: newBal,
        type: 'usage',
      },
      ...prev,
    ]);
    showToast(`1 Token digunakan. Sisa token belajar: ${newBal}`);
  };

  // Submit PR Question
  const handleAnalyzePR = async (data: {
    prompt: string;
    imageBase64?: string;
    mimeType?: string;
    driveUrl?: string;
    fase: string;
    mataPelajaran: string;
  }) => {
    // 1. Check if blocked
    if (isStudentBlocked) {
      setErrorMessage(
        'Akun Anda saat ini sedang diblokir oleh Admin. Tidak dapat memproses soal PR. Silakan hubungi CS WhatsApp: 089673686625 untuk membuka blokir akses.'
      );
      return;
    }

    // 2. Check if student has registered / logged in
    if (!currentStudent) {
      setIsStudentAuthOpen(true);
      showToast('Silakan masuk atau daftar siswa terlebih dahulu (+5 Token Gratis)!');
      return;
    }

    if (tokens <= 0) {
      setIsTopupModalOpen(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCurrentResult(null);
    setLastSubmittedData(data);

    // 1. Putar backsound musik lembut selama menganalisa soal
    startSoftAnalysisBgm();

    // 2. Batas waktu maksimal 10 detik (klien abort jika lewat 9.8 detik)
    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => {
      abortCtrl.abort();
    }, 9800);

    try {
      const res = await safeFetchJson<any>('/api/analyze-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: abortCtrl.signal,
      });

      clearTimeout(timeoutId);

      if (res.isHtmlFallback) {
        throw new Error(
          'Layanan analisis AI belum aktif di server ini. Pastikan backend server atau Netlify Functions sudah aktif.'
        );
      }

      if (!res.ok || !res.data?.success) {
        throw new Error(res.data?.error || 'Gagal menganalisis soal PR.');
      }

      const result: TanyaGuruResult = res.data.data;
      setCurrentResult(result);
      setActiveQuestionMeta(data);

      // Deduct 1 token
      deductTokenForAnalysis(result.ringkasan_materi);

      // Add to history
      const historyItem: SoalHistoryItem = {
        id: `pr-${Date.now()}`,
        timestamp: Date.now(),
        soalText: data.prompt,
        imageUrl: data.imageBase64,
        driveUrl: data.driveUrl,
        fase: data.fase,
        mataPelajaran: data.mataPelajaran,
        result,
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 24)]);

      playChimeSound('success');

      // Scroll smoothly to blackboard
      setTimeout(() => {
        document.getElementById('papan-tulis-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 300);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setErrorMessage(
          'Waktu analisis mencapai batas maksimal 10 detik. Sistem memprioritaskan agar siswa tidak menunggu lama. Silakan tekan tombol "Coba Lagi" untuk diproses secara instan.'
        );
      } else {
        setErrorMessage(err.message || 'Terjadi gangguan saat memproses soal.');
      }
    } finally {
      clearTimeout(timeoutId);
      // Hentikan backsound musik lembut dengan fade out
      stopSoftAnalysisBgm();
      setIsLoading(false);
    }
  };

  // Select item from history
  const handleSelectHistoryItem = (item: SoalHistoryItem) => {
    setCurrentResult(item.result);
    setActiveQuestionMeta({
      prompt: item.soalText,
      imageBase64: item.imageUrl,
      fase: item.fase,
      mataPelajaran: item.mataPelajaran,
    });
    showToast(`Membuka riwayat pembahasan: ${item.result.ringkasan_materi}`);
    setTimeout(() => {
      document.getElementById('papan-tulis-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 200);
  };

  const handleClearHistory = () => {
    if (confirm('Yakin ingin menghapus semua riwayat soal tersimpan?')) {
      setHistory([]);
      showToast('Riwayat berhasil dibersihkan.');
    }
  };

  // Dynamic avatar state
  const avatarState = isLoading
    ? 'thinking'
    : isSpeaking
    ? 'speaking'
    : currentResult
    ? 'celebrating'
    : 'idle';

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-4 z-50 bg-slate-900 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-xl border border-amber-300 flex items-center gap-2 animate-bounce-subtle">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        tokens={tokens}
        onOpenTopup={() => setIsTopupModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenParentGuide={() => setIsParentGuideModalOpen(true)}
        historyCount={history.length}
        userRole={userRole}
        setUserRole={setUserRole}
        userEmail={userEmail}
        student={currentStudent}
        onOpenStudentLogin={() => setIsStudentAuthOpen(true)}
        onLogoutStudent={handleStudentLogout}
      />

      {/* Hero Welcome Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-8 space-y-7">
        {/* Blocked Account Warning Banner */}
        {isStudentBlocked && (
          <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-scale-up">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <p className="font-extrabold text-sm">Akun Siswa Sedang Diblokir oleh Admin</p>
                <p className="text-xs text-rose-800">
                  Akses tanya soal PR dibatasi sementara. Hubungi Customer Service WhatsApp untuk membuka kembali blokir akun belajar Anda.
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/6289673686625?text=Halo%20Admin%20IndoDigital%2C%20akun%20saya%20terblokir%20di%20Tanya%20Guru%2C%20mohon%20bantuan%20buka%20blokir"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" />
              <span>CS WA 089673686625</span>
            </a>
          </div>
        )}

        <section className="bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200/60 rounded-3xl p-5 md:p-8 border-2 border-amber-300 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Mascot Avatar with dynamic speech bubble */}
            <div className="flex-shrink-0">
              <KakBintangAvatar
                state={avatarState}
                size="hero"
                bubbleText={
                  isLoading
                    ? 'Tunggu sebentar ya, Kak Bintang sedang membaca dan membedah logikanya...'
                    : isSpeaking
                    ? 'Dengarkan baik-baik ya, Kak Bintang jelaskan pelan-pelan!'
                    : currentResult
                    ? 'Wah, hebat! Soal ini sudah selesai kita bedah bareng di papan tulis!'
                    : userRole === 'orangtua'
                    ? 'Halo Ayah/Bunda! Yuk kita dampingi ananda memahami PR dengan nalar ceria.'
                    : 'Halo Adik Juara! Ada soal PR yang bikin bingung? Yuk foto atau tulis di sini!'
                }
              />
            </div>

            {/* Intro Copy */}
            <div className="flex-1 text-center md:text-left space-y-2.5">
              <div className="inline-flex items-center gap-1.5 bg-amber-200/80 text-amber-950 px-3 py-1 rounded-full text-xs font-black">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Asisten Belajar Kurikulum Merdeka (Fase A, B & C)</span>
              </div>

              <h2 className="font-['Fredoka',sans-serif] text-2xl md:text-3xl font-black text-amber-950 leading-tight">
                Belajar Jadi Seru, Nalar Makin Tajam, PR Tuntas Bareng Kak Bintang!
              </h2>

              <p className="text-xs md:text-sm text-amber-900/85 font-medium leading-relaxed max-w-2xl">
                Kak Bintang siap menemani siswa SD dan orang tua membedah langkah penyelesaian soal PR secara sabar dan tuntas. Bukan sekadar contekan cepat, tapi melatih logika berpikir agar anak siap jadi juara kelas!
              </p>

              {/* Free Token / Freemium Banner */}
              <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950 bg-white/80 px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs">
                  <Coins className="w-4 h-4 text-amber-600 fill-amber-300" />
                  <span>Kuota Belajar: {tokens} Token Tersedia</span>
                </div>

                <button
                  onClick={() => setIsTopupModalOpen(true)}
                  className="text-xs font-black text-amber-800 hover:text-amber-950 underline underline-offset-4 flex items-center gap-1 cursor-pointer"
                >
                  <span>Isi Ulang via Mayar</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Question Submission Input Box */}
        <section>
          <QuestionInput
            onAnalyze={handleAnalyzePR}
            isLoading={isLoading}
            tokens={tokens}
            onOpenTopup={() => setIsTopupModalOpen(true)}
          />
        </section>

        {/* Active Analysis Loading Progress & Soft Music Card */}
        {isLoading && (
          <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-orange-200 border-2 border-orange-400 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-['Fredoka',sans-serif] font-bold text-sm md:text-base">
                      Kak Bintang Menganalisis Kilat...
                    </span>
                    <span className="text-[10px] bg-white text-orange-700 font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-orange-500" /> Maksimal 10 Detik
                    </span>
                  </div>
                  <div className="text-xs text-amber-100 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span>🎵 Musik lembut belajar aktif</span>
                    <span>•</span>
                    <span className="font-bold text-white bg-black/20 px-2 py-0.5 rounded-md">
                      ⏱️ Estimasi: {Math.max(0, 10 - Math.floor(analysisElapsed))}s lagi
                    </span>
                  </div>
                </div>
              </div>

              {/* Mute/unmute button for comfort */}
              <button
                type="button"
                onClick={() => {
                  const next = !isBgmSilent;
                  setIsBgmSilent(next);
                  setBgmMuted(next);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer self-end sm:self-auto"
                title={isBgmSilent ? 'Nyalakan Musik Lembut' : 'Heningkan Musik'}
              >
                {isBgmSilent ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
                <span>{isBgmSilent ? 'Nyalakan Musik' : 'Matikan Musik'}</span>
              </button>
            </div>

            {/* Visual 10-second countdown progress bar */}
            <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden mt-3 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-200 via-orange-100 to-white rounded-full transition-all duration-100 ease-linear shadow-xs"
                style={{ width: `${Math.min(100, (analysisElapsed / 10) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 md:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs md:text-sm font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-amber-950 leading-snug">{errorMessage}</p>
                <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
                  Kak Bintang siap mencoba kembali membedah soal ini.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              {lastSubmittedData && (
                <button
                  onClick={() => handleAnalyzePR(lastSubmittedData)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Coba Lagi</span>
                </button>
              )}
              <button
                onClick={() => setErrorMessage(null)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* RESULTS SECTION: Audio Narration, Digital Blackboard, Tips Juara, and Practice Challenge */}
        {currentResult && (
          <div id="papan-tulis-section" className="space-y-6 pt-3 animate-fade-in">
            {/* Subject Summary Banner */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-wider uppercase text-amber-200">
                    Materi Pembahasan Selesai
                  </span>
                  <h3 className="text-sm md:text-base font-extrabold">
                    {currentResult.ringkasan_materi}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
                  1 Soal PR Tuntas
                </span>
              </div>
            </div>

            {/* 1. Interactive Audio Narration Player with Autoplay */}
            <AudioNarasiPlayer
              narasiText={currentResult.skrip_audio_narasi}
              onSpeakingChange={setIsSpeaking}
              autoPlay={true}
              onNarrationEnd={() => {
                const el = document.getElementById('papan-tulis-virtual');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />

            {/* 2. Digital Blackboard (Papan Tulis Digital) */}
            <PapanTulisDigital
              ringkasanMateri={currentResult.ringkasan_materi}
              langkahList={currentResult.langkah_papan_tulis}
            />

            {/* 3. Tips Juara Card */}
            <TipsJuaraCard tips={currentResult.tips_juara} />

            {/* 4. Interactive Practice Problem Solver */}
            <SoalLatihanSection
              soalLatihan={currentResult.soal_latihan_serupa}
              ringkasanMateri={currentResult.ringkasan_materi}
            />

            {/* Back to top or ask another question CTA */}
            <div className="text-center pt-2 pb-4">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 border-2 border-amber-300 font-bold text-xs md:text-sm shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Bahas Soal PR Lainnya</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-14 border-t-2 border-amber-200 bg-white py-8 px-4 text-center text-xs text-slate-500 space-y-3.5 shadow-xs">
        {/* Navigation / Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-slate-600 font-semibold text-xs">
          <span>Tanya Guru bersama Kak Bintang</span>
          <span>•</span>
          <span>Kurikulum Merdeka SD</span>
          <span>•</span>
          <a
            href="https://mayar.to/indo-digital"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-amber-700 font-bold"
          >
            Pembayaran Mayar (indo-digital)
          </a>
        </div>

        {/* Powered by IndoDigital & CS WhatsApp */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <span>Powered by</span>
            <span className="font-extrabold text-slate-900 tracking-wide">IndoDigital</span>
            {/* Discreet Admin Lock Button */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="ml-1 text-slate-400 hover:text-slate-800 transition-colors p-0.5 rounded cursor-pointer"
              title="Akses Admin IndoDigital (Backup Gateway Mayar)"
              aria-label="Admin Portal"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href="https://wa.me/6289673686625?text=Halo%20CS%20IndoDigital%2C%20saya%20butuh%20bantuan%20terkait%20aplikasi%20Tanya%20Guru"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-sm hover:shadow transition-all transform hover:scale-[1.02] active:scale-98 cursor-pointer"
            title="Hubungi Layanan Bantuan / CS WhatsApp"
          >
            <MessageCircle className="w-4 h-4 fill-white text-white" />
            <span>CS WhatsApp: 089673686625</span>
          </a>
        </div>

        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
          Dirancang untuk mengasah nalar kritis dan kemandirian belajar anak sekolah dasar di Indonesia.
        </p>
      </footer>

      {/* Modals */}
      <MayarTopupModal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        currentTokens={tokens}
        onAddTokens={handleAddTokens}
        transactions={transactions}
      />

      <RiwayatBelajarModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onSelectHistoryItem={handleSelectHistoryItem}
        onClearHistory={handleClearHistory}
      />

      <ParentGuideModal
        isOpen={isParentGuideModalOpen}
        onClose={() => setIsParentGuideModalOpen(false)}
      />

      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          if (typeof window !== 'undefined' && window.location.hash === '#admin') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
        onCreditTokensToActiveSession={(amount, reason) => {
          handleAddTokens(amount, reason, 'mayar_topup');
          playChimeSound('success');
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }}
        currentUserEmail={userEmail}
        currentTokens={tokens}
        onRefreshActiveStudent={async () => {
          if (currentStudent) {
            try {
              const res = await fetch(`/api/student/status?studentId=${currentStudent.id}`);
              if (res.status === 403) {
                setIsStudentBlocked(true);
                setCurrentStudent((prev) => (prev ? { ...prev, status: 'diblokir' } : null));
              } else if (res.ok) {
                const data = await res.json();
                if (data.student) {
                  setCurrentStudent(data.student);
                  setIsStudentBlocked(data.student.status === 'diblokir');
                  setTokens(data.student.tokens);
                }
              }
            } catch {
              // Ignore
            }
          }
        }}
      />

      {/* Student Login / Register Modal */}
      <StudentAuthModal
        isOpen={isStudentAuthOpen}
        onClose={() => setIsStudentAuthOpen(false)}
        onLoginSuccess={handleStudentLoginSuccess}
        currentStudent={currentStudent}
      />
    </div>
  );
}
