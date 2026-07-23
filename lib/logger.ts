// lib/logger.ts

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const levels: Record<LogLevel, string> = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  debug: 'DEBUG',
};

// ===== ناشناس‌سازی IP =====
function anonymizeIP(ip: string): string {
  if (!ip) return '';
  // حفظ فقط سه بخش اول و جایگزینی آخرین بخش با xxx
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  // برای IPv6 ساده
  if (ip.includes(':')) {
    return ip.substring(0, ip.lastIndexOf(':')) + ':xxx';
  }
  return ip;
}

function log(level: LogLevel, message: string, ...meta: any[]) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${levels[level]}]`;

  // ===== ناشناس‌سازی meta =====
  let safeMeta = meta.map((item) => {
    if (item && typeof item === 'object') {
      const copy = { ...item };
      // ناشناس‌سازی IP
      if (copy.ip) {
        copy.ip = anonymizeIP(copy.ip);
      }
      if (copy.clientIP) {
        copy.clientIP = anonymizeIP(copy.clientIP);
      }
      if (copy.userIP) {
        copy.userIP = anonymizeIP(copy.userIP);
      }
      // حذف اطلاعات حساس
      delete copy.apiKey;
      delete copy.authorization;
      delete copy.secret;
      delete copy.token;
      delete copy.password;
      return copy;
    }
    return item;
  });

  if (process.env.NODE_ENV === 'production' && level === 'debug') {
    return;
  }

  if (safeMeta.length > 0) {
    console[level](prefix, message, ...safeMeta);
  } else {
    console[level](prefix, message);
  }
}

export default {
  info: (msg: string, ...meta: any[]) => log('info', msg, ...meta),
  warn: (msg: string, ...meta: any[]) => log('warn', msg, ...meta),
  error: (msg: string, ...meta: any[]) => log('error', msg, ...meta),
  debug: (msg: string, ...meta: any[]) => log('debug', msg, ...meta),
};