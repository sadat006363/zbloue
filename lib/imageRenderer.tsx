import satori from 'satori';
import { Resvg } from '@resvg/resvg-wasm';
import { highlightCode } from './shiki';
import fs from 'fs';
import path from 'path';

async function loadFont(): Promise<ArrayBuffer> {
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter_18pt-Regular.ttf');
    console.log('🔍 Loading font from:', fontPath);
    
    if (!fs.existsSync(fontPath)) {
      console.error('❌ Font file not found at:', fontPath);
      throw new Error(`Font file not found at: ${fontPath}`);
    }
    
    const fontBuffer = fs.readFileSync(fontPath);
    console.log('✅ Font loaded successfully, size:', fontBuffer.length);
    
    return fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength
    );
  } catch (error) {
    console.error('❌ Font loading error:', error);
    throw new Error(`Font loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateCardImage(code: string, language: string, title: string) {
  try {
    console.log('🖼️ Generating card image for:', { language, title, codeLength: code.length });
    
    const highlightedHtml = await highlightCode(code, language);
    console.log('✅ Code highlighted successfully');
    
    const fontData = await loadFont();
    console.log('✅ Font loaded successfully');

    const svg = await satori(
      <div
        style={{
          backgroundColor: '#1e1e2e',
          color: '#cdd6f4',
          padding: '40px',
          width: '800px',
          height: '600px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#89b4fa', marginBottom: '20px' }}>
          {title || 'Code Snippet'}
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            fontSize: '18px',
            lineHeight: '1.6',
            fontFamily: 'monospace',
          }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
        <div
          style={{
            marginTop: '20px',
            fontSize: '14px',
            color: '#6c7086',
            borderTop: '1px solid #313244',
            paddingTop: '15px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Zbloue</span>
          <span>{language.toUpperCase()}</span>
        </div>
      </div>,
      {
        width: 800,
        height: 600,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            weight: 400,
            style: 'normal',
          },
        ],
      }
    );

    console.log('✅ Satori SVG generated successfully, length:', svg.length);

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 800 },
    });
    
    const pngBuffer = resvg.render().asPng();
    console.log('✅ PNG generated successfully, size:', pngBuffer.length);
    
    return pngBuffer;
  } catch (error) {
    console.error('❌ Error generating card image:', error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}