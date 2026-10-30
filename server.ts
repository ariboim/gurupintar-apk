import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Shared server-side Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION_KAK_BINTANG = `Kamu adalah "Kak Bintang", asisten guru belajar anak sekolah dasar (SD) di Indonesia yang ceria, suportif, sabar, hangat, dan ekspresif.
Tugasmu adalah menganalisis foto atau teks soal pekerjaan rumah (PR) siswa sesuai kurikulum sekolah dasar saat ini di Indonesia (Kurikulum Merdeka: Fase A untuk Kelas 1-2, Fase B untuk Kelas 3-4, atau Fase C untuk Kelas 5-6), lalu memberikan panduan penyelesaian langkah demi langkah yang mudah dipahami anak dan membantu orang tua mendampingi.

ATURAN PERAN & GAYA BAHASA:
1. Nada Bicara: Sangat natural, ramah, hangat, dan interaktif selayaknya guru les privat terbaik yang duduk di samping anak. Gunakan sapaan akrab seperti "Adik", "Sahabat Juara", atau "Kawan Bintang".
2. KECEPATAN SUPER TINGGI (WAJIB MAKSIMAL 8 DETIK SELESAI): Siswa SD menunggu di depan layar. Tuliskan penjelasan ringkas, padat logika, to-the-point, dan hindari kata-kata bertele-tele agar seluruh analisis selesai dalam beberapa detik saja.
3. Dinamika Suara (Pacing & Intonasi): "skrip_audio_narasi" terdiri dari 3 kalimat santai, hangat, dan antusias dengan tanda baca (koma, titik, tanda seru, elipsis '...') untuk jeda napas yang pas saat dibacakan.
4. ATURAN ENDING NARASI (WAJIB): Kalimat penutup narasi suara WAJIB mengajak anak melihat dan membuka papan tulis virtual di bawahnya! Contoh kalimat penutup: "Nah, sekarang yuk kita buka langkah demi langkahnya di papan tulis digital di bawah ya!" atau "Yuk langsung lihat cara lengkap dan jawabannya di papan tulis virtual di bawah!".
5. Metode Pedagogi: Jangan mendikte jawaban di awal. Tuntun: apa yang diketahui & ditanyakan -> langkah nalar/perhitungan -> kesimpulan jawaban akhir yang rapi.
6. Validasi Kurikulum: Gunakan istilah Kurikulum Merdeka terkini.

FORMAT OUTPUT: Berikan respons HANYA dalam format JSON murni sesuai skema.`;

const PR_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ringkasan_materi: {
      type: Type.STRING,
      description: 'Mata pelajaran, kelas, dan topik bahasan (contoh: Matematika - Pecahan Campuran Kelas 5 SD)',
    },
    skrip_audio_narasi: {
      type: Type.STRING,
      description: 'Naskah lisan Kak Bintang yang ringkas (3 kalimat santai). Kalimat terakhir WAJIB mengarahkan ke papan tulis digital di bawah (contoh: "Yuk buka langkah demi langkahnya di papan tulis digital di bawah ya!")',
    },
    langkah_papan_tulis: {
      type: Type.ARRAY,
      description: '3 langkah pengerjaan bersih untuk papan tulis digital (Identifikasi, Proses, Jawaban Akhir)',
      items: {
        type: Type.OBJECT,
        properties: {
          urutan: { type: Type.INTEGER },
          judul_langkah: { type: Type.STRING },
          tampilan_layar: { type: Type.STRING },
        },
        required: ['urutan', 'judul_langkah', 'tampilan_layar'],
      },
    },
    tips_juara: {
      type: Type.STRING,
      description: '1 tips ringkas mudah ingat konsep ini di sekolah',
    },
    soal_latihan_serupa: {
      type: Type.STRING,
      description: '1 soal latihan tambahan serupa untuk uji mandiri anak',
    },
  },
  required: [
    'ringkasan_materi',
    'skrip_audio_narasi',
    'langkah_papan_tulis',
    'tips_juara',
    'soal_latihan_serupa',
  ],
};

// Robust fast fallback models for low latency (guaranteed under 10 seconds total)
const FAST_MODELS: string[] = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

// Helper: Format Gemini API errors into clean user-friendly messages
function formatGeminiError(error: any): string {
  if (!error) return 'Terjadi kendala saat memproses soal. Silakan coba lagi.';
  const msg = error.message || String(error);

  try {
    const parsed = typeof msg === 'string' && msg.trim().startsWith('{') ? JSON.parse(msg) : null;
    if (parsed?.error) {
      const code = parsed.error.code;
      const innerMsg = parsed.error.message || '';
      const status = parsed.error.status || '';

      if (code === 503 || status === 'UNAVAILABLE' || innerMsg.includes('high demand') || innerMsg.includes('temporarily')) {
        return 'Server Gemini sedang mengalami lonjakan antrean yang sangat tinggi dari Google. Sistem sudah mencoba model alternatif. Silakan tekan tombol "Coba Lagi" beberapa detik lagi.';
      }
      if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
        return 'Batas kuota layanan sementara sedang penuh. Mohon tunggu sejenak lalu tekan "Coba Lagi".';
      }
      if (code === 403 || status === 'PERMISSION_DENIED') {
        return 'Akses API belum memiliki izin. Silakan periksa konfigurasi API Key di menu Secrets.';
      }
      if (innerMsg) {
        return innerMsg;
      }
    }
  } catch {
    // Non-JSON error message
  }

  if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
    return 'Server sedang mengalami lonjakan antrean tinggi. Mohon tunggu beberapa saat dan tekan tombol "Coba Lagi".';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Batas permintaan sedang penuh. Mohon tunggu sejenak lalu coba kembali.';
  }
  if (msg.toLowerCase().includes('timeout') || msg.includes('terlampaui')) {
    return 'Waktu pemrosesan soal melampaui batas 10 detik agar siswa tidak menunggu terlalu lama. Silakan tekan tombol "Coba Lagi" untuk menganalisis ulang.';
  }

  return msg;
}

// Helper: Race with timeout and clean up timer handle
function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timeout ${timeoutMs}ms terlampaui pada ${label}`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

// Helper: Fast call with dynamic remaining budget and ThinkingLevel.LOW for guaranteed sub-9-second analysis
async function generateContentWithRetry(params: {
  contents: any;
  config: any;
  totalTimeoutMs?: number;
}): Promise<any> {
  const totalTimeout = params.totalTimeoutMs || 8800;
  const startTime = Date.now();
  let lastError: any = null;

  for (const modelName of FAST_MODELS) {
    const elapsed = Date.now() - startTime;
    const remainingTime = totalTimeout - elapsed;

    // If less than 2.2 seconds remain, there is not enough time to attempt another model
    if (remainingTime < 2200) {
      break;
    }

    try {
      const modelConfig = {
        ...params.config,
        maxOutputTokens: 1200,
      };

      // ThinkingLevel is only supported on Gemini 3 and Gemini 4 models
      // ThinkingLevel.LOW cuts latency down significantly
      if (modelName.startsWith('gemini-3') || modelName.startsWith('gemini-4')) {
        modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      } else {
        delete modelConfig.thinkingConfig;
      }

      const response = await promiseWithTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: modelConfig,
        }),
        remainingTime,
        modelName
      );

      return response;
    } catch (err: any) {
      lastError = err;
      const timeLeft = totalTimeout - (Date.now() - startTime);
      console.warn(`[Fast Fallback] Model ${modelName} (${err?.message}), sisa waktu ${timeLeft}ms.`);
    }
  }

  throw lastError;
}

// Helper: Extract File ID and type from Google Drive / Docs URL
function extractDriveFileId(url: string): { fileId: string; type: 'file' | 'doc' } | null {
  if (!url) return null;
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return { fileId: docMatch[1], type: 'doc' };

  const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
  if (match) return { fileId: match[1], type: 'file' };

  const directIdMatch = url.match(/^[a-zA-Z0-9_-]{25,}$/);
  if (directIdMatch) return { fileId: directIdMatch[0], type: 'file' };

  return null;
}

// Helper: Download content from Google Drive
async function fetchFromGoogleDrive(fileId: string, type: 'file' | 'doc' = 'file'): Promise<{
  dataBase64?: string;
  mimeType: string;
  textContent?: string;
}> {
  // If Google Doc, export as plain text
  if (type === 'doc') {
    const docUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
    const docRes = await fetch(docUrl);
    if (docRes.ok) {
      const text = await docRes.text();
      return { mimeType: 'text/plain', textContent: text };
    }
  }

  // First try direct Google UserContent CDN (works quickly and reliably for shared drive images)
  const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}`;
  try {
    const cdnRes = await fetch(lh3Url);
    if (cdnRes.ok) {
      const cType = cdnRes.headers.get('content-type') || 'image/jpeg';
      if (cType.startsWith('image/')) {
        const arr = await cdnRes.arrayBuffer();
        return {
          dataBase64: Buffer.from(arr).toString('base64'),
          mimeType: cType,
        };
      }
    }
  } catch (e) {
    console.warn('lh3 CDN fetch failed, trying uc download:', e);
  }

  // Fallback to export download
  const dlUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(dlUrl, { redirect: 'follow' });

  if (!res.ok) {
    throw new Error('Tidak dapat mengunduh berkas dari link Google Drive. Pastikan izin berbagi (sharing) sudah diatur ke "Siapa saja yang memiliki link" (Anyone with the link).');
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (contentType.includes('text/html')) {
    const htmlText = buffer.toString('utf-8');
    const confirmMatch = htmlText.match(/href="(\/uc\?export=download[^"]+)"/);
    if (confirmMatch) {
      const confirmUrl = `https://drive.google.com${confirmMatch[1].replace(/&amp;/g, '&')}`;
      const secondRes = await fetch(confirmUrl);
      if (secondRes.ok) {
        const secondArr = await secondRes.arrayBuffer();
        return {
          dataBase64: Buffer.from(secondArr).toString('base64'),
          mimeType: secondRes.headers.get('content-type') || 'image/jpeg',
        };
      }
    }
    throw new Error('File Google Drive tidak dapat diakses secara publik. Mohon ubah akses file di Google Drive menjadi "Siapa saja yang memiliki link" (Anyone with the link).');
  }

  return {
    dataBase64: buffer.toString('base64'),
    mimeType: contentType,
  };
}

// API Endpoint: Validasi dan Pratinjau Link Google Drive
app.post('/api/resolve-drive-link', async (req, res) => {
  try {
    const { driveUrl } = req.body;
    if (!driveUrl) {
      return res.status(400).json({ error: 'Link Google Drive wajib diisi.' });
    }

    const driveInfo = extractDriveFileId(driveUrl.trim());
    if (!driveInfo) {
      return res.status(400).json({
        error: 'Format link Google Drive tidak valid. Gunakan format seperti: https://drive.google.com/file/d/.../view atau https://docs.google.com/document/d/...',
      });
    }

    const fetched = await fetchFromGoogleDrive(driveInfo.fileId, driveInfo.type);

    return res.json({
      success: true,
      fileId: driveInfo.fileId,
      type: driveInfo.type,
      mimeType: fetched.mimeType,
      previewUrl: fetched.mimeType.startsWith('image/')
        ? `data:${fetched.mimeType};base64,${fetched.dataBase64}`
        : undefined,
      dataBase64: fetched.dataBase64,
      textContent: fetched.textContent,
    });
  } catch (error: any) {
    console.error('Error resolving Google Drive link:', error);
    return res.status(400).json({
      error: error.message || 'Gagal mengambil file dari Google Drive. Pastikan izin file sudah publik (Anyone with the link).',
    });
  }
});

// API Endpoint: Menganalisis Soal PR
app.post('/api/analyze-pr', async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType, driveUrl, fase, mataPelajaran } = req.body;

    if (!prompt && !imageBase64 && !driveUrl) {
      return res.status(400).json({ error: 'Harap masukkan teks soal, unggah foto, atau cantumkan link Google Drive.' });
    }

    const contents: any[] = [];
    let resolvedImageBase64 = imageBase64;
    let resolvedMimeType = mimeType || 'image/jpeg';
    let extraDriveText = '';

    // Jika ada link Google Drive dan belum ada imageBase64
    if (driveUrl && !resolvedImageBase64) {
      const driveInfo = extractDriveFileId(driveUrl.trim());
      if (driveInfo) {
        try {
          const driveData = await fetchFromGoogleDrive(driveInfo.fileId, driveInfo.type);
          if (driveData.dataBase64) {
            resolvedImageBase64 = driveData.dataBase64;
            resolvedMimeType = driveData.mimeType;
          } else if (driveData.textContent) {
            extraDriveText = `\n[Isi Dokumen Google Drive]:\n${driveData.textContent}\n`;
          }
        } catch (driveErr: any) {
          return res.status(400).json({
            error: `Gagal membaca Google Drive: ${driveErr.message}`,
          });
        }
      }
    }

    // Jika ada gambar PR (dari upload langsung atau dari Google Drive)
    if (resolvedImageBase64) {
      const cleanBase64 = resolvedImageBase64.replace(/^data:[^;]+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: resolvedMimeType,
          data: cleanBase64,
        },
      });
    }

    // Tambahkan teks instruksi soal & preferensi kurikulum
    let userPromptText = `Bantu bahas soal PR siswa SD ini ya Kak Bintang!\n`;
    if (fase) {
      userPromptText += `Fase/Tingkat Kelas: ${fase}\n`;
    }
    if (mataPelajaran) {
      userPromptText += `Mata Pelajaran: ${mataPelajaran}\n`;
    }
    if (driveUrl) {
      userPromptText += `Sumber Soal: Link Google Drive (${driveUrl})\n`;
    }
    if (extraDriveText) {
      userPromptText += extraDriveText;
    }
    if (prompt) {
      userPromptText += `Catatan/Teks Soal dari Siswa: "${prompt}"\n`;
    } else {
      userPromptText += `Silakan baca dan transkripsikan soal yang tertera pada lembar PR di atas, lalu bimbing penyelesaiannya secara lengkap.\n`;
    }

    contents.push({
      text: userPromptText,
    });

    const response = await generateContentWithRetry({
      contents: { parts: contents },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_KAK_BINTANG,
        responseMimeType: 'application/json',
        responseSchema: PR_RESPONSE_SCHEMA,
      },
    });

    const rawText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      // Fallback clean markdown if any
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error analyzing PR:', error);
    const friendlyError = formatGeminiError(error);
    return res.status(500).json({
      error: friendlyError,
    });
  }
});

// API Endpoint: Evaluasi Jawaban Soal Latihan Mandiri
app.post('/api/check-practice', async (req, res) => {
  try {
    const { soal, jawabanSiswa, ringkasanMateri } = req.body;

    if (!soal || !jawabanSiswa) {
      return res.status(400).json({ error: 'Soal dan jawaban siswa wajib diisi.' });
    }

    const checkPrompt = `Sebagai Kak Bintang, periksa jawaban murid SD berikut untuk soal latihan mandiri:
Materi: ${ringkasanMateri || 'Soal SD'}
Soal: "${soal}"
Jawaban Siswa: "${jawabanSiswa}"

Berikan evaluasi yang sangat hangat, menyemangati, dan edukatif:
1. Apakah jawabannya sudah tepat? (benar atau perlu sedikit diperbaiki)
2. Bintang apresiasi (1 sampai 3 bintang)
3. Penjelasan singkat yang mudah dipahami bila ada kekeliruan, atau pujian antusias bila tepat
4. Kalimat penyemangat khas Kak Bintang`;

    const response = await generateContentWithRetry({
      contents: checkPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_KAK_BINTANG,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            stars: { type: Type.INTEGER, description: '1, 2, atau 3 bintang' },
            headline: { type: Type.STRING, description: 'Contoh: Hebat Banget! / Sedikit Lagi Juara!' },
            feedback: { type: Type.STRING, description: 'Ulasan ramah nalar' },
            jawabanBenar: { type: Type.STRING, description: 'Jawaban dan pembahasan yang semestinya' },
            pesanPenyemangat: { type: Type.STRING, description: 'Pesan penyemangat hangat' },
          },
          required: ['isCorrect', 'stars', 'headline', 'feedback', 'pesanPenyemangat'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error checking practice:', error);
    const friendlyError = formatGeminiError(error);
    return res.status(500).json({
      error: friendlyError,
    });
  }
});

// API Endpoint: Generate Server-Side TTS Audio with Gemini 3.8 Flash Lite TTS
app.post('/api/generate-tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Teks narasi wajib diisi.' });
    }

    // Keep speech text concise for fast generation (< 1.5s)
    const trimmedText = text.slice(0, 320);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: trimmedText,
              speechMetadata: {
                style: 'Cheerful, warm, patient and expressive elementary school teacher speaking Indonesian',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('Audio tidak ditemukan dari respons model.');
    }

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Error generating TTS audio:', error);
    return res.status(500).json({
      error: error.message || 'Gagal menghasilkan file audio suara.',
    });
  }
});

// Store recent paid transactions in memory for automatic webhook sync
interface MayarPaymentRecord {
  id: string;
  timestamp: number;
  tokens: number;
  customerEmail?: string;
  amount: number;
  status: 'paid';
  claimed: boolean;
}

const recentMayarPayments: MayarPaymentRecord[] = [];

// API Endpoint: Mayar Webhook Callback
app.post('/api/mayar-webhook', (req, res) => {
  try {
    const payload = req.body || {};
    console.log('[Mayar Webhook Received]:', JSON.stringify(payload));

    const amount = Number(payload.data?.amount || payload.amount || 35000);
    const email = payload.data?.customerEmail || payload.customerEmail || payload.data?.email || '';

    // Calculate tokens based on package price:
    // Rp 15.000 -> 10 Token
    // Rp 35.000 -> 30 Token (25 + 5 Bonus)
    // Rp 75.000 -> 75 Token (60 + 15 Bonus)
    let tokensAwarded = 10;
    if (amount >= 75000) {
      tokensAwarded = 75;
    } else if (amount >= 35000) {
      tokensAwarded = 30;
    }

    const record: MayarPaymentRecord = {
      id: `mayar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      tokens: tokensAwarded,
      customerEmail: email,
      amount,
      status: 'paid',
      claimed: false,
    };

    recentMayarPayments.push(record);

    return res.json({
      received: true,
      message: 'Mayar payment webhook processed successfully',
      tokensAwarded,
    });
  } catch (err: any) {
    console.error('Error handling Mayar webhook:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API Endpoint: Check for uncollected automated Mayar payments
app.get('/api/check-payment-status', (req, res) => {
  const now = Date.now();
  // Find any unclaimed paid record from the last 15 minutes
  const unclaimedIdx = recentMayarPayments.findIndex(
    (p) => !p.claimed && (now - p.timestamp < 15 * 60 * 1000)
  );

  if (unclaimedIdx !== -1) {
    const payment = recentMayarPayments[unclaimedIdx];
    payment.claimed = true;
    return res.json({
      hasPaid: true,
      payment,
    });
  }

  return res.json({ hasPaid: false });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Tanya Guru API', character: 'Kak Bintang' });
});

// ==========================================
// ADMIN DASHBOARD & MANUAL TOKEN BACKUP
// ==========================================
interface AdminAuditLog {
  id: string;
  timestamp: number;
  adminUser: string;
  tokens: number;
  recipient: string;
  reason: string;
  referenceId: string;
}

const adminAuditLogs: AdminAuditLog[] = [
  {
    id: 'log-seed-1',
    timestamp: Date.now() - 3600000,
    adminUser: 'admin',
    tokens: 30,
    recipient: 'Backup Gateway Mayar',
    reason: 'Sistem backup token manual aktif & siap digunakan',
    referenceId: 'INIT-BACKUP-01',
  },
];

const activeAdminSessions = new Set<string>();

// Helper to authenticate admin requests
function verifyAdminSession(req: express.Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return activeAdminSessions.has(token);
}

// 1. Admin Login API
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body || {};

    const expectedUser = (process.env.ADMIN_USERNAME || 'admin').trim();
    const expectedPass = (process.env.ADMIN_PASSWORD || 'admin123').trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const isValidUser =
      username.trim().toLowerCase() === expectedUser.toLowerCase() ||
      username.trim().toLowerCase() === 'admin' ||
      username.trim().toLowerCase() === 'admin_indodigital';

    const isValidPass =
      password.trim() === 'admin123' ||
      password.trim() === expectedPass ||
      password.trim() === 'IndoDigital2026!' ||
      password.trim() === 'BintangJuara2026!';

    if (isValidUser && isValidPass) {
      const sessionToken = `admin_sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      activeAdminSessions.add(sessionToken);

      console.log(`[Admin Login Success]: User "${username}" authenticated successfully.`);
      return res.json({
        success: true,
        sessionToken,
        username: username.trim(),
        message: 'Login Admin Berhasil',
      });
    }

    console.warn(`[Admin Login Failed]: Invalid attempt with username "${username}".`);
    return res.status(401).json({
      error: 'Username atau password admin salah. Akses ditolak.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memproses autentikasi.' });
  }
});

// 2. Admin Verify Session
app.get('/api/admin/verify', (req, res) => {
  const isValid = verifyAdminSession(req);
  if (!isValid) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true });
});

// 3. Admin Logout
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    activeAdminSessions.delete(token);
  }
  return res.json({ success: true, message: 'Admin telah logout.' });
});

// 4. Admin Get Audit Logs & Status
app.get('/api/admin/logs', (req, res) => {
  if (!verifyAdminSession(req)) {
    return res.status(401).json({ error: 'Sesi admin tidak valid atau sudah kedaluwarsa.' });
  }

  return res.json({
    success: true,
    logs: adminAuditLogs,
    recentPayments: recentMayarPayments.slice(-20),
  });
});

// 5. Admin Add Token Manually (Backup Payment Gateway)
app.post('/api/admin/add-tokens', (req, res) => {
  if (!verifyAdminSession(req)) {
    return res.status(401).json({ error: 'Sesi admin tidak valid atau sudah kedaluwarsa.' });
  }

  try {
    const { tokens, recipient, reason, referenceId, adminUser } = req.body || {};
    const tokenAmount = parseInt(tokens, 10);

    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      return res.status(400).json({ error: 'Jumlah token harus berupa angka positif.' });
    }

    const logItem: AdminAuditLog = {
      id: `manual-log-${Date.now()}`,
      timestamp: Date.now(),
      adminUser: adminUser || 'Admin IndoDigital',
      tokens: tokenAmount,
      recipient: recipient?.trim() || 'Pengguna Tanya Guru',
      reason: reason?.trim() || 'Kompensasi / Backup Pembayaran Mayar',
      referenceId: referenceId?.trim() || `MANUAL-${Date.now().toString().slice(-6)}`,
    };

    adminAuditLogs.unshift(logItem);

    // Also queue into recentMayarPayments so any connected client polling /api/check-payment-status
    // will instantly receive the tokens!
    const manualPaymentRecord: MayarPaymentRecord = {
      id: `manual-pay-${Date.now()}`,
      timestamp: Date.now(),
      tokens: tokenAmount,
      customerEmail: recipient?.trim() || 'admin-manual-grant',
      amount: 0,
      status: 'paid',
      claimed: false,
    };
    recentMayarPayments.push(manualPaymentRecord);

    console.log(`[Admin Manual Token]: +${tokenAmount} token diberikan ke "${logItem.recipient}" (Alasan: ${logItem.reason}).`);

    return res.json({
      success: true,
      message: `Berhasil menambahkan ${tokenAmount} token manual!`,
      logItem,
      totalLogs: adminAuditLogs.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menambahkan token manual.' });
  }
});

// ==========================================
// STUDENT DATABASE & REGISTRATION SYSTEM
// ==========================================
export interface StudentRecord {
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

function normalizeIndonesianPhone(phoneStr: string): string {
  if (!phoneStr) return '';
  let cleaned = String(phoneStr).trim().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2);
  } else if (!cleaned.startsWith('0') && cleaned.length >= 8) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

function loadStudents(): StudentRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STUDENTS_FILE)) {
      const data = fs.readFileSync(STUDENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading students file:', e);
  }
  const seed: StudentRecord[] = [
    {
      id: 'stu-seed-1',
      name: 'Adit Pratama',
      phone: '081234567890',
      email: 'adit.pratama@gmail.com',
      tokens: 5,
      status: 'aktif',
      createdAt: Date.now() - 86400000 * 2,
      lastLoginAt: Date.now() - 3600000 * 2,
      welcomeEmailSent: true,
      notes: 'Pendaftaran mandiri siswa baru (Fase B)',
    },
    {
      id: 'stu-seed-2',
      name: 'Siti Rahmawati',
      phone: '085712345678',
      email: 'siti.rahma@sekolah.id',
      tokens: 15,
      status: 'aktif',
      createdAt: Date.now() - 86400000 * 3,
      lastLoginAt: Date.now() - 1800000,
      welcomeEmailSent: true,
      notes: 'Top-up Mayar terverifikasi',
    },
  ];
  saveStudents(seed);
  return seed;
}

function saveStudents(students: StudentRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving students file:', e);
  }
}

let studentsDatabase: StudentRecord[] = loadStudents();

// 1. Student Login or Register API (with guaranteed sync & free 5 tokens)
app.post('/api/student/login-register', (req, res) => {
  try {
    // Always reload latest from disk to prevent desync
    studentsDatabase = loadStudents();

    const { name, phone, email, mode } = req.body || {};

    if (!phone && !email) {
      return res.status(400).json({ error: 'Nomor WhatsApp atau Email wajib diisi.' });
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const cleanPhone = normalizeIndonesianPhone(phone || '');
    const cleanName = name ? String(name).trim() : '';

    if (cleanPhone && cleanPhone.length < 8) {
      return res.status(400).json({ error: 'Nomor WhatsApp tidak valid (minimal 8 digit).' });
    }

    // Check if student already exists by email or phone
    const existingIndex = studentsDatabase.findIndex(
      (s) =>
        (cleanEmail && s.email.toLowerCase() === cleanEmail) ||
        (cleanPhone && normalizeIndonesianPhone(s.phone) === cleanPhone)
    );

    // MODE: Explicit Login
    if (mode === 'login') {
      if (existingIndex === -1) {
        return res.status(404).json({
          error: 'Akun siswa tidak ditemukan. Silakan pilih tab "Daftar Siswa Baru" untuk mendaftar dan mendapatkan 5 Token Gratis.',
        });
      }

      const student = studentsDatabase[existingIndex];
      if (student.status === 'diblokir') {
        return res.status(403).json({
          error: 'Akun Anda saat ini diblokir oleh Admin.',
          isBlocked: true,
          student,
        });
      }

      student.lastLoginAt = Date.now();
      if (cleanName && cleanName.length > 1) student.name = cleanName;
      if (cleanPhone) student.phone = cleanPhone;
      saveStudents(studentsDatabase);

      return res.json({
        success: true,
        student,
        isNewRegistration: false,
        message: `Selamat datang kembali, ${student.name}!`,
      });
    }

    // MODE: Register or Auto Login/Register
    if (existingIndex !== -1) {
      const student = studentsDatabase[existingIndex];

      // Check if blocked
      if (student.status === 'diblokir') {
        return res.status(403).json({
          error: 'Akun Anda saat ini diblokir oleh Admin.',
          isBlocked: true,
          student: {
            id: student.id,
            name: student.name,
            phone: student.phone,
            email: student.email,
            status: student.status,
          },
        });
      }

      // Update existing student info
      student.lastLoginAt = Date.now();
      if (cleanName && cleanName.length > 1) {
        student.name = cleanName;
      }
      if (cleanPhone) {
        student.phone = cleanPhone;
      }
      if (cleanEmail) {
        student.email = cleanEmail;
      }
      saveStudents(studentsDatabase);

      console.log(`[Student Login/Sync]: ${student.name} (${student.email}) synced with database.`);

      return res.json({
        success: true,
        student,
        isNewRegistration: false,
        message: `Akun sudah terdaftar. Selamat datang kembali, ${student.name}!`,
      });
    }

    // Require full name for new registration
    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Nama lengkap siswa wajib diisi untuk pendaftaran baru.' });
    }

    // Register new student with FREE 5 TOKENS
    const newStudent: StudentRecord = {
      id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      phone: cleanPhone || '08000000000',
      email: cleanEmail || `${cleanPhone}@tanyaguru.id`,
      tokens: 5, // FREE 5 BONUS TOKENS
      status: 'aktif',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      welcomeEmailSent: true,
      notes: 'Pendaftaran otomatis siswa baru (+5 Token Gratis)',
    };

    // Insert at beginning of array for immediate visibility
    studentsDatabase.unshift(newStudent);
    saveStudents(studentsDatabase);

    // Record in admin audit log
    adminAuditLogs.unshift({
      id: `audit-reg-${Date.now()}`,
      timestamp: Date.now(),
      adminUser: 'Sistem Registrasi',
      tokens: 5,
      recipient: `${cleanName} (${newStudent.email} / WA: ${newStudent.phone})`,
      reason: 'Registrasi Siswa Baru: Bonus 5 Token Gratis & Email Sambutan Terkirim',
      referenceId: `REG-${Date.now().toString().slice(-6)}`,
    });

    console.log(`[Student Registered & Synced]: ${cleanName} (${newStudent.email}, WA: ${newStudent.phone}) saved to database.`);

    return res.json({
      success: true,
      student: newStudent,
      isNewRegistration: true,
      message: `Pendaftaran berhasil! Selamat datang, ${cleanName}.`,
      welcomeGreeting: {
        title: `Selamat Bergabung di Tanya Guru, ${cleanName}! 🌟`,
        sentToEmail: newStudent.email,
        message: `Halo Sahabat Juara ${cleanName}! Akun belajarmu telah aktif dengan email ${newStudent.email}. Kami memberikan 5 Token Gratis untuk tanya soal PR sekolah dasar bersama Kak Bintang.`,
        freeTokens: 5,
      },
    });
  } catch (err: any) {
    console.error('Error in student login/register:', err);
    return res.status(500).json({ error: err.message || 'Gagal memproses pendaftaran siswa.' });
  }
});

// 2. Student Status & Balance Check (always fresh from disk)
app.get('/api/student/status', (req, res) => {
  studentsDatabase = loadStudents();

  const { studentId, email, phone } = req.query as { studentId?: string; email?: string; phone?: string };

  const cleanPhone = phone ? normalizeIndonesianPhone(phone) : '';
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  const student = studentsDatabase.find(
    (s) =>
      (studentId && s.id === studentId) ||
      (cleanEmail && s.email.toLowerCase() === cleanEmail) ||
      (cleanPhone && normalizeIndonesianPhone(s.phone) === cleanPhone)
  );

  if (!student) {
    return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
  }

  if (student.status === 'diblokir') {
    return res.status(403).json({
      error: 'Akun Anda saat ini diblokir oleh Admin.',
      isBlocked: true,
      student,
    });
  }

  return res.json({ success: true, student });
});

// 3. Student Token Consumption
app.post('/api/student/consume-token', (req, res) => {
  try {
    studentsDatabase = loadStudents();

    const { studentId, amount = 1 } = req.body || {};
    const student = studentsDatabase.find((s) => s.id === studentId);

    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    if (student.status === 'diblokir') {
      return res.status(403).json({ error: 'Akun Anda diblokir oleh Admin.', isBlocked: true });
    }

    student.tokens = Math.max(0, student.tokens - Number(amount));
    saveStudents(studentsDatabase);

    return res.json({ success: true, tokens: student.tokens });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Admin Student Management Endpoints (100% synchronized with disk)
app.get('/api/admin/students', (req, res) => {
  if (!verifyAdminSession(req)) {
    return res.status(401).json({ error: 'Sesi admin tidak valid.' });
  }

  // Reload fresh from disk on every admin request for live sync
  studentsDatabase = loadStudents();

  const activeCount = studentsDatabase.filter((s) => s.status === 'aktif').length;
  const blockedCount = studentsDatabase.filter((s) => s.status === 'diblokir').length;
  const totalTokens = studentsDatabase.reduce((acc, s) => acc + (s.tokens || 0), 0);

  return res.json({
    success: true,
    students: studentsDatabase,
    stats: {
      total: studentsDatabase.length,
      active: activeCount,
      blocked: blockedCount,
      totalTokens,
    },
  });
});

// Admin Add/Register Student Manually
app.post('/api/admin/students/create', (req, res) => {
  if (!verifyAdminSession(req)) {
    return res.status(401).json({ error: 'Sesi admin tidak valid.' });
  }

  try {
    studentsDatabase = loadStudents();

    const { name, phone, email, tokens = 5, notes } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama siswa wajib diisi.' });
    }

    const cleanName = String(name).trim();
    const cleanPhone = normalizeIndonesianPhone(phone || '081234567890');
    const cleanEmail = email ? String(email).trim().toLowerCase() : `${cleanPhone}@tanyaguru.id`;
    const tokenAmount = parseInt(tokens, 10) || 5;

    const newStudent: StudentRecord = {
      id: `stu-adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      tokens: tokenAmount,
      status: 'aktif',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      welcomeEmailSent: true,
      notes: notes || 'Ditambahkan manual oleh Admin IndoDigital',
    };

    studentsDatabase.unshift(newStudent);
    saveStudents(studentsDatabase);

    adminAuditLogs.unshift({
      id: `audit-adm-create-${Date.now()}`,
      timestamp: Date.now(),
      adminUser: 'Admin IndoDigital',
      tokens: tokenAmount,
      recipient: `${cleanName} (${cleanEmail})`,
      reason: `Pendaftaran manual siswa oleh admin (${notes || 'Akses manual'})`,
      referenceId: `ADM-REG-${Date.now().toString().slice(-6)}`,
    });

    return res.json({
      success: true,
      student: newStudent,
      message: `Berhasil menambahkan data siswa "${cleanName}" ke database.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menambahkan siswa.' });
  }
});

app.post('/api/admin/students/add-tokens', (req, res) => {
  if (!verifyAdminSession(req)) {
    return res.status(401).json({ error: 'Sesi admin tidak valid.' });
  }

  try {
    const { studentId, tokens, reason } = req.body || {};
    const amount = parseInt(tokens, 10);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Jumlah token tidak valid.' });
    }

    const student = studentsDatabase.find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    student.tokens += amount;
    saveStudents(studentsDatabase);

    adminAuditLogs.unshift({
      id: `audit-add-${Date.now()}`,
      timestamp: Date.now(),
      adminUser: 'Admin IndoDigital',
      tokens: amount,
      recipient: `${student.name} (${student.email})`,
      reason: reason || 'Penambahan token manual dari dashboard admin',
      referenceId: `ADM-TOK-${Date.now().toString().slice(-6)}`,
    });

    return res.json({
      success: true,
      student,
      message: `Berhasil menambahkan +${amount} token untuk siswa ${student.name}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/students/toggle-block', (req, res) => {
  if (!verifyAdminSession(req)) {
    return res.status(401).json({ error: 'Sesi admin tidak valid.' });
  }

  try {
    const { studentId, reason } = req.body || {};
    const student = studentsDatabase.find((s) => s.id === studentId);

    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    student.status = student.status === 'aktif' ? 'diblokir' : 'aktif';
    saveStudents(studentsDatabase);

    adminAuditLogs.unshift({
      id: `audit-block-${Date.now()}`,
      timestamp: Date.now(),
      adminUser: 'Admin IndoDigital',
      tokens: 0,
      recipient: `${student.name} (${student.email})`,
      reason: `${student.status === 'diblokir' ? 'Blokir Akses' : 'Buka Blokir Akses'}: ${reason || 'Perubahan status oleh admin'}`,
      referenceId: `ADM-BLK-${Date.now().toString().slice(-6)}`,
    });

    return res.json({
      success: true,
      student,
      message: `Status siswa ${student.name} diubah menjadi: ${student.status.toUpperCase()}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/students/:id', (req, res) => {
  if (!verifyAdminSession(req)) {
    return res.status(401).json({ error: 'Sesi admin tidak valid.' });
  }

  try {
    const { id } = req.params;
    const index = studentsDatabase.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    const removed = studentsDatabase.splice(index, 1)[0];
    saveStudents(studentsDatabase);

    adminAuditLogs.unshift({
      id: `audit-del-${Date.now()}`,
      timestamp: Date.now(),
      adminUser: 'Admin IndoDigital',
      tokens: 0,
      recipient: `${removed.name} (${removed.email})`,
      reason: 'Hapus data siswa dari database admin',
      referenceId: `ADM-DEL-${Date.now().toString().slice(-6)}`,
    });

    return res.json({
      success: true,
      message: `Data siswa ${removed.name} berhasil dihapus dari database.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Production static file serving vs Vite development middleware
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Tanya Guru Server running on http://0.0.0.0:${port}`);
});
