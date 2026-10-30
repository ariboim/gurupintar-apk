export interface PapanTulisLangkah {
  urutan: number;
  judul_langkah: string;
  tampilan_layar: string;
}

export interface TanyaGuruResult {
  ringkasan_materi: string;
  skrip_audio_narasi: string;
  langkah_papan_tulis: PapanTulisLangkah[];
  tips_juara: string;
  soal_latihan_serupa: string;
}

export interface SoalHistoryItem {
  id: string;
  timestamp: number;
  soalText?: string;
  imageUrl?: string;
  driveUrl?: string;
  fase: string;
  mataPelajaran: string;
  result: TanyaGuruResult;
}

export interface TokenTransaction {
  id: string;
  timestamp: number;
  description: string;
  amount: number; // positive for topup, negative for used
  balanceAfter: number;
  type: 'bonus' | 'usage' | 'mayar_topup' | 'voucher';
}

export interface MayarPackage {
  id: string;
  name: string;
  tokens: number;
  bonusTokens: number;
  price: number;
  priceFormatted: string;
  badge?: string;
  popular?: boolean;
  description: string;
}

export interface PracticeEvaluation {
  isCorrect: boolean;
  stars: number;
  headline: string;
  feedback: string;
  jawabanBenar?: string;
  pesanPenyemangat: string;
}

export interface StudentUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  tokens: number;
  status: 'aktif' | 'diblokir';
  createdAt: number;
  lastLoginAt: number;
  welcomeEmailSent: boolean;
  notes?: string;
}

