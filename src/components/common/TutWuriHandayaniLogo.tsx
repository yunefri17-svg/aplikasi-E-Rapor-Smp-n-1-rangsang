import React from 'react';

export const TUT_WURI_LOGO_SRC = '/tut_wuri_handayani.png';

/**
 * Official Kemendikbud Tut Wuri Handayani Logo
 * Uses the exact official high-resolution PNG provided by user
 */
export const TutWuriHandayaniLogo: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-36 h-36',
  size
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <img
      src={TUT_WURI_LOGO_SRC}
      alt="Logo Tut Wuri Handayani"
      className={`${className} object-contain mx-auto select-none`}
      style={style}
      loading="eager"
    />
  );
};

// Canvas-based base64 exporter for jsPDF
let cachedLogoDataUrl: string | null = null;

export const getTutWuriHandayaniDataUrl = async (): Promise<string> => {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          cachedLogoDataUrl = dataUrl;
          resolve(dataUrl);
        } else {
          resolve('');
        }
      };

      img.onerror = () => {
        // Fallback to relative path directly
        resolve(TUT_WURI_LOGO_SRC);
      };

      img.src = TUT_WURI_LOGO_SRC;
    } catch {
      resolve('');
    }
  });
};
