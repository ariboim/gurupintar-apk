import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Phone,
  Mail,
  Coins,
  CheckCircle2,
  AlertCircle,
  X,
  MessageCircle,
  ShieldAlert,
  ArrowRight,
  Gift,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChimeSound } from '../utils/speech';
import { StudentUser } from '../types';
import { studentLoginOrRegister } from '../utils/studentSync';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (student: StudentUser, welcomeInfo?: { title: string; sentToEmail: string; message: string; freeTokens: number }) => void;
  currentStudent: StudentUser | null;
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentStudent,
}) => {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState(currentStudent?.name || '');
  const [phone, setPhone] = useState(currentStudent?.phone || '');
  const [email, setEmail] = useState(currentStudent?.email || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{
    student: StudentUser;
    title: string;
    sentToEmail: string;
    message: string;
    freeTokens: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'register') {
      if (!name.trim() || !phone.trim() || !email.trim()) {
        setErrorMsg('Mohon lengkapi Nama Lengkap, Nomor WhatsApp, dan Email untuk pendaftaran siswa baru.');
        return;
      }
    } else {
      if (!phone.trim() && !email.trim()) {
        setErrorMsg('Silakan masukkan Nomor WhatsApp atau Email terdaftar.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);
    setIsBlocked(false);

    try {
      const result = await studentLoginOrRegister({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        mode: authMode,
      });

      if (!result.success) {
        if (result.isBlocked) {
          setIsBlocked(true);
        }
        setErrorMsg(result.error || 'Gagal memproses data siswa.');
        return;
      }

      const student: StudentUser = result.student;

      if (result.isNewRegistration && result.welcomeGreeting) {
        setWelcomeData({
          student,
          title: result.welcomeGreeting.title,
          sentToEmail: result.welcomeGreeting.sentToEmail,
          message: result.welcomeGreeting.message,
          freeTokens: result.welcomeGreeting.freeTokens,
        });
        playChimeSound('success');
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } else {
        onLoginSuccess(student);
        playChimeSound('success');
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishWelcome = () => {
    if (welcomeData) {
      onLoginSuccess(welcomeData.student, {
        title: welcomeData.title,
        sentToEmail: welcomeData.sentToEmail,
        message: welcomeData.message,
        freeTokens: welcomeData.freeTokens,
      });
    }
    setWelcomeData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-amber-300 overflow-hidden my-auto animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <Sparkles className="w-6 h-6 fill-white" />
            </div>
            <div>
              <h3 className="font-['Fredoka',sans-serif] font-black text-lg text-white">
                Masuk / Daftar Siswa
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                Tanya PR Bareng Kak Bintang SD
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {welcomeData ? (
            /* ================= WELCOME SCREEN WITH EMAIL GREETING ================= */
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Gift className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">
                  {welcomeData.title}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                  Pendaftaran berhasil! Akun belajarmu telah terdata secara otomatis di database Tanya Guru.
                </p>
              </div>

              {/* Free Tokens Highlight Card */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center space-y-1 shadow-xs">
                <div className="inline-flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-xs">
                  <Coins className="w-4 h-4 text-amber-100 fill-amber-200" />
                  <span>+{welcomeData.freeTokens} Token Gratis Ditambahkan!</span>
                </div>
                <p className="text-xs text-amber-900 font-semibold pt-1">
                  Gunakan 5 token ini untuk bertanya dan membedah soal PR sekolah bersama Kak Bintang.
                </p>
              </div>

              {/* Simulated Welcome Email Greeting Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-500 pb-1 border-b border-slate-200">
                  <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-slate-700">Ucapan Selamat Datang Email:</span>
                  <span className="ml-auto text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Terkirim ke {welcomeData.sentToEmail}
                  </span>
                </div>
                <p className="text-slate-800 font-semibold leading-relaxed">
                  "{welcomeData.message}"
                </p>
              </div>

              <button
                onClick={handleFinishWelcome}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Mulai Tanya Soal PR Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* ================= LOGIN / REGISTER FORM ================= */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tab Selector: Daftar Siswa Baru vs Masuk */}
              <div className="grid grid-cols-2 p-1 bg-amber-50/80 rounded-2xl border border-amber-200 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg(null);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'register'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                      : 'text-amber-900 hover:text-amber-950 hover:bg-amber-100/50'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Daftar Siswa (+5 Token)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'login'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                      : 'text-amber-900 hover:text-amber-950 hover:bg-amber-100/50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Masuk Akun</span>
                </button>
              </div>

              {/* Promo Banner for Registration */}
              {authMode === 'register' && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs">
                    <p className="font-extrabold text-amber-950">Bonus 5 Token Belajar Gratis!</p>
                    <p className="text-[11px] text-amber-800">
                      Data otomatis terhubung ke sistem Tanya Guru & Dashboard Admin IndoDigital.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {errorMsg && (
                <div className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                  isBlocked ? 'bg-red-100 border-2 border-red-400 text-red-900' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {isBlocked ? (
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <p className="font-bold">{errorMsg}</p>
                    {isBlocked && (
                      <a
                        href="https://wa.me/6289673686625?text=Halo%20Admin%20IndoDigital%2C%20akun%20saya%20terblokir%20di%20Tanya%20Guru%2C%20mohon%20bantuan%20buka%20blokir"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[11px] transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-white" />
                        <span>Hubungi CS WhatsApp (089673686625)</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Input: Nama Siswa (Required on Register) */}
              {(authMode === 'register' || name) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nama Lengkap Siswa {authMode === 'register' && <span className="text-rose-500">*</span>}</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    required={authMode === 'register'}
                  />
                </div>
              )}

              {/* Input: Nomor WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nomor WhatsApp (WA) {authMode === 'register' && <span className="text-rose-500">*</span>}</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  required={authMode === 'register'}
                />
                <p className="text-[10px] text-slate-400">
                  Digunakan untuk nomor akun & verifikasi CS WhatsApp.
                </p>
              </div>

              {/* Input: Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Alamat Email {authMode === 'register' && <span className="text-rose-500">*</span>}</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: budi@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  required={authMode === 'register'}
                />
                <p className="text-[10px] text-slate-400">
                  {authMode === 'register'
                    ? 'Ucapan selamat datang & bukti 5 token gratis dikirimkan ke email ini.'
                    : 'Email akun siswa terdaftar.'}
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Menyimpan & Menyinkronkan Data...</span>
                ) : authMode === 'register' ? (
                  <>
                    <Coins className="w-4 h-4 text-amber-200 fill-amber-200" />
                    <span>Daftar Sekarang (+5 Token Gratis)</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-white" />
                    <span>Masuk ke Akun Siswa</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>Data terhubung otomatis ke Dashboard Admin IndoDigital</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:underline text-slate-600 font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
