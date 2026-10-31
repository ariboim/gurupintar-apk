import { GoogleGenAI, Type } from '@google/genai';

// In-memory student store for serverless instance lifetime
interface StudentRecord {
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

let serverlessStudents: StudentRecord[] = [
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

const activeSessions = new Set<string>();

function normalizePhone(p: string): string {
  if (!p) return '';
  let c = String(p).trim().replace(/[^0-9]/g, '');
  if (c.startsWith('62')) c = '0' + c.slice(2);
  else if (!c.startsWith('0') && c.length >= 8) c = '0' + c;
  return c;
}

export const handler = async (event: any, context: any) => {
  const path = event.path || '';
  const method = (event.httpMethod || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};

    // 1. Student Login / Register
    if (path.includes('/student/login-register')) {
      const { name, phone, email, mode } = body;
      const cleanEmail = email ? String(email).trim().toLowerCase() : '';
      const cleanPhone = normalizePhone(phone || '');
      const cleanName = name ? String(name).trim() : '';

      const existingIdx = serverlessStudents.findIndex(
        (s) =>
          (cleanEmail && s.email.toLowerCase() === cleanEmail) ||
          (cleanPhone && normalizePhone(s.phone) === cleanPhone)
      );

      if (mode === 'login') {
        if (existingIdx === -1) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              error: 'Akun siswa tidak ditemukan. Silakan pilih tab "Daftar Siswa Baru" untuk mendaftar dan mendapatkan 5 Token Gratis.',
            }),
          };
        }
        const stu = serverlessStudents[existingIdx];
        if (stu.status === 'diblokir') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: 'Akun Anda saat ini diblokir oleh Admin.',
              isBlocked: true,
              student: stu,
            }),
          };
        }
        stu.lastLoginAt = Date.now();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, isNewRegistration: false, student: stu }),
        };
      }

      // Mode: Register
      if (existingIdx !== -1) {
        const stu = serverlessStudents[existingIdx];
        stu.lastLoginAt = Date.now();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, isNewRegistration: false, student: stu }),
        };
      }

      const newStudent: StudentRecord = {
        id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName || 'Sahabat Juara',
        phone: cleanPhone,
        email: cleanEmail,
        tokens: 5,
        status: 'aktif',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        welcomeEmailSent: true,
        notes: 'Pendaftaran siswa baru (+5 Token Gratis)',
      };

      serverlessStudents.unshift(newStudent);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          isNewRegistration: true,
          student: newStudent,
          welcomeGreeting: {
            title: 'Selamat Datang di Tanya Guru SD! 🌟',
            sentToEmail: cleanEmail,
            message: `Halo ${newStudent.name}! Pendaftaran berhasil. Selamat datang di Tanya Guru SD bersama Kak Bintang. Kamu mendapatkan BONUS 5 TOKEN GRATIS untuk mencoba tanya soal PR sekolah.`,
            freeTokens: 5,
          },
        }),
      };
    }

    // 2. Admin Login
    if (path.includes('/admin/login')) {
      const { username, password } = body;
      const u = (username || '').trim().toLowerCase();
      const p = (password || '').trim();

      if ((u === 'admin' || u === 'admin_indodigital') && (p === 'admin123' || p === 'IndoDigital2026!')) {
        const token = `admin_sess_${Date.now()}`;
        activeSessions.add(token);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, sessionToken: token, username: u }),
        };
      }
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Username atau password admin salah. Akses ditolak.' }),
      };
    }

    // 3. Admin Students List
    if (path.includes('/admin/students') && method === 'GET') {
      const stats = {
        totalStudents: serverlessStudents.length,
        activeStudents: serverlessStudents.filter((s) => s.status === 'aktif').length,
        blockedStudents: serverlessStudents.filter((s) => s.status === 'diblokir').length,
        totalTokens: serverlessStudents.reduce((a, b) => a + (b.tokens || 0), 0),
      };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, students: serverlessStudents, stats }),
      };
    }

    // Default 404
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `Route ${path} tidak ditemukan pada Netlify Functions` }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Serverless function error' }),
    };
  }
};
