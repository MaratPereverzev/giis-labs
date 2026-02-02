import { useState, useRef, useEffect } from 'react';

export function LabTemplate() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<string>('');

  // Загрузка изображения
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      setImage(img);
      // Рисуем на canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')!;
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
      }
    };
  };

  // Обработка изображения
  const processImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Пример: Преобразование в оттенки серого
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      data[i] = data[i + 1] = data[i + 2] = Math.round(gray);
    }

    ctx.putImageData(imageData, 0, 0);
    setResult('Обработка завершена!');
  };

  // Скачать результат
  const downloadResult = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'result.png';
    link.click();
  };

  return (
    <div className="lab-component">
      <h1>Шаблон Лабораторной Работы</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Левая колонка - управление */}
        <div>
          <h3>Управление</h3>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'block', marginBottom: '10px' }}
          />

          <button
            onClick={processImage}
            disabled={!image}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              cursor: image ? 'pointer' : 'not-allowed',
            }}
          >
            Обработать
          </button>

          <button
            onClick={downloadResult}
            style={{ padding: '10px 20px' }}
          >
            Скачать
          </button>

          {result && <p style={{ color: '#667eea', marginTop: '10px' }}>{result}</p>}
        </div>

        {/* Правая колонка - результат */}
        <div>
          <h3>Результат</h3>
          <canvas
            ref={canvasRef}
            style={{
              border: '1px solid #ddd',
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ========================================
// 2. РАБОТА С ЦВЕТОМ - RGB ↔ HSV
// ========================================

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  let v = max;

  if (max !== 0) s = delta / max;

  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / delta + 2) / 6;
    else h = ((r - g) / delta + 4) / 6;
  }

  return [h * 360, s * 100, v * 100];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h /= 360;
  s /= 100;
  v /= 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r, g, b;

  switch (i % 6) {
    case 0:
      [r, g, b] = [v, t, p];
      break;
    case 1:
      [r, g, b] = [q, v, p];
      break;
    case 2:
      [r, g, b] = [p, v, t];
      break;
    case 3:
      [r, g, b] = [p, q, v];
      break;
    case 4:
      [r, g, b] = [t, p, v];
      break;
    default:
      [r, g, b] = [v, p, q];
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ========================================
// 3. МАТРИЦЫ СВЁРТКИ ДЛЯ ФИЛЬТРОВ
// ========================================

const BLUR_KERNEL = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
];
const BLUR_DIVISOR = 16;

const SHARPEN_KERNEL = [
  [0, -1, 0],
  [-1, 5, -1],
  [0, -1, 0],
];
const SHARPEN_DIVISOR = 1;

const EDGE_DETECTION_KERNEL = [
  [-1, -1, -1],
  [-1, 8, -1],
  [-1, -1, -1],
];
const EDGE_DIVISOR = 1;

function applyConvolution(
  imageData: ImageData,
  kernel: number[][],
  divisor: number
) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(data);

  const kernelSize = kernel.length;
  const offset = Math.floor(kernelSize / 2);

  for (let y = offset; y < height - offset; y++) {
    for (let x = offset; x < width - offset; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = x + kx - offset;
          const py = y + ky - offset;
          const idx = (py * width + px) * 4;

          r += data[idx] * kernel[ky][kx];
          g += data[idx + 1] * kernel[ky][kx];
          b += data[idx + 2] * kernel[ky][kx];
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = Math.max(0, Math.min(255, Math.round(r / divisor)));
      output[idx + 1] = Math.max(0, Math.min(255, Math.round(g / divisor)));
      output[idx + 2] = Math.max(0, Math.min(255, Math.round(b / divisor)));
    }
  }

  imageData.data.set(output);
  return imageData;
}

// ========================================
// 4. МОРФОЛОГИЧЕСКИЕ ОПЕРАЦИИ
// ========================================

function erode(imageData: ImageData, radius: number = 1) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(data);

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let minR = 255, minG = 255, minB = 255;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          minR = Math.min(minR, data[idx]);
          minG = Math.min(minG, data[idx + 1]);
          minB = Math.min(minB, data[idx + 2]);
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = minR;
      output[idx + 1] = minG;
      output[idx + 2] = minB;
    }
  }

  imageData.data.set(output);
  return imageData;
}

function dilate(imageData: ImageData, radius: number = 1) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(data);

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let maxR = 0, maxG = 0, maxB = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          maxR = Math.max(maxR, data[idx]);
          maxG = Math.max(maxG, data[idx + 1]);
          maxB = Math.max(maxB, data[idx + 2]);
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = maxR;
      output[idx + 1] = maxG;
      output[idx + 2] = maxB;
    }
  }

  imageData.data.set(output);
  return imageData;
}

// ========================================
// 5. ПОРОГОВАЯ ОБРАБОТКА
// ========================================

function thresholding(imageData: ImageData, threshold: number = 128) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }

  return imageData;
}

// ========================================
// 6. МАСШТАБИРОВАНИЕ ИЗОБРАЖЕНИЯ
// ========================================

function scaleImage(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;

  const ctx = targetCanvas.getContext('2d')!;
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  return targetCanvas;
}

// ========================================
// 7. ПОЛЕЗНЫЕ ТИПЫ TypeScript
// ========================================

interface ImageSize {
  width: number;
  height: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

interface ProcessingResult {
  success: boolean;
  message: string;
  data?: any;
}

// ========================================
// ЭКСПОРТ
// ========================================

export {
  rgbToHsv,
  hsvToRgb,
  applyConvolution,
  erode,
  dilate,
  thresholding,
  scaleImage,
  BLUR_KERNEL,
  SHARPEN_KERNEL,
  EDGE_DETECTION_KERNEL,
};
