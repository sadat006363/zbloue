// lib/cardImageGenerator.ts
import { ImageResponse } from '@vercel/og';
import React from 'react';

interface CardImageOptions {
  slug: string;
  title: string;
  username: string;
  theme: string;
  appUrl: string;
}

export async function generateCardImageBuffer({
  slug,
  title,
  username,
  theme,
  appUrl,
}: CardImageOptions): Promise<Buffer> {
  // ===== انتخاب رنگ تم =====
  const themeColors: Record<string, { bg: string; gradient: string; accent: string }> = {
    blue: { bg: '#0f0f1a', gradient: '135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%', accent: '#4a86f7' },
    purple: { bg: '#0f0f1a', gradient: '135deg, #0f0f1a 0%, #1a1a2e 50%, #2d1b4e 100%', accent: '#a855f7' },
    green: { bg: '#0f0f1a', gradient: '135deg, #0f0f1a 0%, #1a1a2e 50%, #064e3b 100%', accent: '#10b981' },
    orange: { bg: '#0f0f1a', gradient: '135deg, #0f0f1a 0%, #1a1a2e 50%, #451a03 100%', accent: '#fb923c' },
    pink: { bg: '#0f0f1a', gradient: '135deg, #0f0f1a 0%, #1a1a2e 50%, #3b0a2a 100%', accent: '#ec4899' },
  };

  const colors = themeColors[theme] || themeColors.blue;

  // ===== ساخت JSX کارت =====
  const cardElement = (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        backgroundImage: `linear-gradient(${colors.gradient})`,
        padding: 60,
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* ===== Background Pattern ===== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: 'radial-gradient(circle at 25px 25px, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ===== Glow Effects ===== */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `rgba(74, 134, 247, 0.1)`,
          filter: 'blur(60px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `rgba(168, 85, 247, 0.1)`,
          filter: 'blur(60px)',
        }}
      />

      {/* ===== Logo ===== */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, zIndex: 1 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: `linear-gradient(135deg, #4a86f7, #7c3aed)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white',
            marginRight: 16,
          }}
        >
          {'</>'}
        </div>
        <div>
          <span style={{ fontSize: 36, fontWeight: 'bold', color: 'white' }}>Zbloue</span>
          <p style={{ fontSize: 16, color: '#6c7086', margin: 0 }}>AI Code Analysis</p>
        </div>
      </div>

      {/* ===== Title ===== */}
      <h1
        style={{
          fontSize: 48,
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          marginBottom: 12,
          zIndex: 1,
          maxWidth: '80%',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>

      {/* ===== Username ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 20px',
          borderRadius: 50,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: colors.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14,
            fontWeight: 'bold',
          }}
        >
          {username.charAt(0).toUpperCase()}
        </div>
        <span style={{ color: 'white', fontSize: 18 }}>{username}</span>
      </div>

      {/* ===== Footer ===== */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <span style={{ color: '#6c7086', fontSize: 14 }}>
          🔗 {`${appUrl}/snippet/${slug}`}
        </span>
      </div>

      {/* ===== Watermark ===== */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 24,
          fontSize: 12,
          color: 'rgba(255,255,255,0.1)',
          zIndex: 1,
        }}
      >
        Zbloue
      </div>
    </div>
  );

  // ===== تولید تصویر با @vercel/og =====
  const response = new ImageResponse(cardElement, {
    width: 1200,
    height: 630,
  });

  // ===== تبدیل به Buffer =====
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}