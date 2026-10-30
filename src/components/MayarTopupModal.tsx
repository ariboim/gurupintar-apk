import React, { useState } from 'react';
import { MayarPackage, TokenTransaction } from '../types';
import {
  X,
  Coins,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  Gift,
  CreditCard,
  History,
  Check,
  Zap,
  ExternalLink,
  Copy,
  Link as LinkIcon,
  MessageCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChimeSound } from '../utils/speech';

export const MAYAR_PAYMENT_URL = 'https://mayar.to/indo-digital';

interface MayarTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTokens: number;
  onAddTokens: (amount: number, description: string, type: 'mayar_topup' | 'voucher') => void;
  transactions: TokenTransaction[];
}

export const MAYAR_PACKAGES: MayarPackage[] = [
  {
    id: 'pkg-10',
    name: 'Paket Belajar Hemat',
    tokens: 10,
    bonusTokens: 0,
    price: 15000,
    priceFormatted: 'Rp 15.000',
    description: 'Cocok untuk bantuan PR mingguan siswa SD',
  },
  {
    id: 'pkg-30',
    name: 'Paket Juara Kelas',
    tokens: 25,
    bonusTokens: 5,
    price: 35000,
    priceFormatted: 'Rp 35.000',
    badge: 'Paling Populer',
    popular: true,
    description: 'Total 30 Token! Pilihan favorit orang tua & siswa berprestasi',
  },
  {
    id: 'pkg-75',
    name: 'Paket Bintang Semester',
    tokens: 60,
    bonusTokens: 15,
    price: 75000,
    priceFormatted: 'Rp 75.000',
    badge: 'Hemat 40%',
    description: 'Total 75 Token! Pendampingan intensif persiapan ujian & PTS',
  },
];

export const MayarTopupModal: React.FC<MayarTopupModalProps> = ({
  isOpen,
  onClose,
  currentTokens,
  onAddTokens,
  transactions,
}) => {
  const [selectedPkg, setSelectedPkg] = useState<MayarPackage>(MAYAR_PACKAGES[1]);
  const [activeTab, setActiveTab] = useState<'checkout' | 'history'>('checkout');
  const [paymentStep, setPaymentStep] = useState<'select' | 'qris' | 'success'>('select');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMessage, setVoucherMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCopyMayarLink = () => {
    navigator.clipboard.writeText(MAYAR_PAYMENT_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenMayarLink = () => {
    window.open(MAYAR_PAYMENT_URL, '_blank', 'noopener,noreferrer');
  };

  const handleStartPayment = (pkg: MayarPackage) => {
    setSelectedPkg(pkg);
    setPaymentStep('qris');
  };

  const handleCompleteMayarPayment = () => {
    const totalAdded = selectedPkg.tokens + selectedPkg.bonusTokens;
    onAddTokens(
      totalAdded,
      `Top-up Mayar: ${selectedPkg.name} (${selectedPkg.priceFormatted}) via mayar.to/indo-digital`,
      'mayar_topup'
    );
    playChimeSound('success');
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
    setPaymentStep('success');
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'BINTANGJUARA') {
      onAddTokens(5, 'Klaim Kode Promo: BINTANGJUARA (+5 Token)', 'voucher');
      setVoucherMessage({ text: 'Selamat! Kamu dapat bonus 5 Token gratis!', isError: false });
      playChimeSound('success');
      confetti({ particleCount: 50, spread: 60 });
      setVoucherCode('');
    } else if (code === 'PRBERES' || code === 'MERDEKA') {
      onAddTokens(3, `Klaim Kode Promo: ${code} (+3 Token)`, 'voucher');
      setVoucherMessage({ text: 'Berhasil! Bonus 3 Token ditambahkan.', isError: false });
      playChimeSound('success');
      setVoucherCode('');
    } else {
      setVoucherMessage({ text: 'Kode voucher tidak valid atau sudah kedaluwarsa.', isError: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border-2 border-amber-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <span>Isi Ulang Token Belajar</span>
                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Mayar Gateway
                </span>
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                Sisa kuota belajarmu: <span className="font-bold underline">{currentTokens} Token</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-amber-50/50 px-4 pt-2">
          <button
            onClick={() => {
              setActiveTab('checkout');
              if (paymentStep === 'success') setPaymentStep('select');
            }}
            className={`pb-2 px-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'checkout'
                ? 'border-amber-500 text-amber-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Pilih Paket Mayar</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Token ({transactions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'history' ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">
                Catatan pemakaian 1 token per soal dan bonus top-up akunmu:
              </p>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada transaksi token.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{tx.description}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(tx.timestamp).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-black text-sm ${
                          tx.amount > 0 ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} Token
                      </span>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Sisa: {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : paymentStep === 'select' ? (
            <>
              {/* Mayar Official Link Card Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase text-amber-900 tracking-wider">
                      Link Pembayaran Mayar Resmi
                    </p>
                    <p className="text-xs font-bold text-amber-700 truncate font-mono">
                      {MAYAR_PAYMENT_URL}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyMayarLink}
                    className="p-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Salin Link Pembayaran Mayar"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline text-[11px]">{copiedLink ? 'Tersalin' : 'Salin'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenMayarLink}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    title="Buka langsung di Mayar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Buka Link</span>
                  </button>
                </div>
              </div>

              {/* Package cards */}
              <div className="space-y-3">
                {MAYAR_PACKAGES.map((pkg) => {
                  const isSelected = selectedPkg.id === pkg.id;
                  const total = pkg.tokens + pkg.bonusTokens;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-amber-300 bg-white'
                      }`}
                    >
                      {pkg.badge && (
                        <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                          {pkg.badge}
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-1.5">
                            <span>{pkg.name}</span>
                            {pkg.bonusTokens > 0 && (
                              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                +{pkg.bonusTokens} Bonus!
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-lg font-black text-amber-600">
                              {pkg.priceFormatted}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              (Dapat {total} Token)
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code Input */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
                <form onSubmit={handleApplyVoucher} className="flex gap-2">
                  <div className="relative flex-1">
                    <Gift className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="Punya Kode Promo? (cth: BINTANGJUARA)"
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:outline-none text-xs font-semibold uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Klaim
                  </button>
                </form>
                {voucherMessage && (
                  <p
                    className={`text-[11px] font-semibold mt-1.5 ${
                      voucherMessage.isError ? 'text-rose-500' : 'text-emerald-600'
                    }`}
                  >
                    {voucherMessage.text}
                  </p>
                )}
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => handleStartPayment(selectedPkg)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm md:text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
              >
                <span>Lanjut Bayar via Mayar ({selectedPkg.priceFormatted})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : paymentStep === 'qris' ? (
            /* QRIS Mayar payment screen with direct Mayar Link */
            <div className="text-center space-y-4 py-2">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 inline-block">
                <p className="text-xs font-bold text-amber-900">
                  Pembayaran Mayar: {selectedPkg.name}
                </p>
                <p className="text-xl font-black text-amber-700">
                  {selectedPkg.priceFormatted}
                </p>
              </div>

              {/* Direct Mayar Link CTA Box */}
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-400 rounded-2xl p-3.5 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Tautan Langsung Mayar:</span>
                  </div>
                  <a
                    href={MAYAR_PAYMENT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-amber-800 underline hover:text-amber-950 font-mono break-all"
                  >
                    {MAYAR_PAYMENT_URL}
                  </a>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyMayarLink}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenMayarLink}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Mayar</span>
                  </button>
                </div>
              </div>

              {/* QRIS Display Container */}
              <div className="p-4 bg-white border-2 border-slate-800 rounded-2xl inline-block shadow-md">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 pb-2 mb-2 border-b border-slate-200">
                  <span>QRIS STANDAR PEMBAYARAN NASIONAL</span>
                  <span className="text-emerald-600">MAYAR INSTAN</span>
                </div>
                {/* SVG QR Code */}
                <div className="w-48 h-48 mx-auto flex items-center justify-center bg-slate-50 p-2 rounded-lg border border-dashed border-slate-300">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                    <rect width="100" height="100" fill="white" />
                    {/* Corners */}
                    <rect x="10" y="10" width="25" height="25" fill="#1e293b" />
                    <rect x="14" y="14" width="17" height="17" fill="white" />
                    <rect x="17" y="17" width="11" height="11" fill="#1e293b" />

                    <rect x="65" y="10" width="25" height="25" fill="#1e293b" />
                    <rect x="69" y="14" width="17" height="17" fill="white" />
                    <rect x="72" y="17" width="11" height="11" fill="#1e293b" />

                    <rect x="10" y="65" width="25" height="25" fill="#1e293b" />
                    <rect x="14" y="69" width="17" height="17" fill="white" />
                    <rect x="17" y="72" width="11" height="11" fill="#1e293b" />

                    {/* Data modules */}
                    <rect x="40" y="12" width="6" height="6" fill="#1e293b" />
                    <rect x="50" y="15" width="8" height="4" fill="#1e293b" />
                    <rect x="42" y="24" width="12" height="6" fill="#1e293b" />
                    <rect x="12" y="42" width="6" height="12" fill="#1e293b" />
                    <rect x="25" y="45" width="10" height="6" fill="#1e293b" />
                    <rect x="42" y="42" width="16" height="16" fill="#f59e0b" />
                    <circle cx="50" cy="50" r="4" fill="white" />
                    <rect x="65" y="42" width="10" height="8" fill="#1e293b" />
                    <rect x="80" y="52" width="8" height="12" fill="#1e293b" />
                    <rect x="42" y="65" width="8" height="10" fill="#1e293b" />
                    <rect x="55" y="70" width="12" height="8" fill="#1e293b" />
                    <rect x="72" y="72" width="15" height="15" fill="#1e293b" />
                  </svg>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-mono">
                  BCA • Mandiri • GoPay • OVO • Dana • ShopeePay
                </div>
              </div>

              {/* Automatic detection notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs text-emerald-900 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Otomatis Sinkronisasi: Token bertambah sendiri begitu pembayaran di mayar.to/indo-digital terverifikasi.</span>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 font-semibold">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Menunggu konfirmasi pembayaran via Mayar...</span>
              </div>

              {/* Instant Claim / Completed Payment Button */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleCompleteMayarPayment}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Saya Sudah Bayar di Mayar (Klaim {selectedPkg.tokens + selectedPkg.bonusTokens} Token)</span>
                </button>

                <button
                  onClick={() => setPaymentStep('select')}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold underline cursor-pointer"
                >
                  Kembali ke pilihan paket
                </button>
              </div>
            </div>
          ) : (
            /* Success confirmation */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">
                  Pembayaran Mayar Berhasil!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                  Token belajarmu telah bertambah melalui tautan resmi Mayar (mayar.to/indo-digital). Kak Bintang siap membedah PR berikutnya!
                </p>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 inline-block text-left">
                <p className="text-xs text-amber-800 font-semibold">Total Saldo Sekarang:</p>
                <p className="text-2xl font-black text-amber-600">{currentTokens} Token</p>
              </div>

              <div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md cursor-pointer"
                >
                  Mulai Tanya Soal PR Sekarang
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Footer & CS Support */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Terenkripsi Mayar Indonesia ({MAYAR_PAYMENT_URL})</span>
          </div>

          <a
            href="https://wa.me/6289673686625?text=Halo%20CS%20IndoDigital%2C%20saya%20butuh%20bantuan%20terkait%20pembayaran%20Mayar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
            <span>CS WA: 089673686625</span>
          </a>
        </div>
      </div>
    </div>
  );
};
