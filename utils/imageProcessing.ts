
import { StencilSettings } from '../types';

/**
 * Analyzes the pixel buffer to find potential thermal printing issues.
 */
export const analyzeThermalIssues = (
  originalData: ImageData,
  processedData: ImageData
): ImageData | null => {
  const width = processedData.width;
  const height = processedData.height;
  const output = new ImageData(width, height);
  const data = processedData.data;
  const outData = output.data;

  const isBlack = (idx: number) => data[idx] < 50 && data[idx+3] > 200;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      if (isBlack(idx)) {
        let density = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
             if (isBlack(((y + dy) * width + (x + dx)) * 4)) density++;
          }
        }
        
        const r = data[idx];
        if (r > 100 && r < 200 && data[idx+3] > 200) {
           outData[idx] = 255;   // R
           outData[idx+1] = 63;  // G
           outData[idx+2] = 88;  // B (#FF3F58)
           outData[idx+3] = 200; // Alpha
        }
      }
    }
  }
  
  return output;
};


/**
 * Main processing function to transform ImageData based on settings
 */
export const processStencil = (
  imageData: ImageData, 
  settings: StencilSettings
): { processed: ImageData, thermalWarnings: ImageData | null } => {
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  const data = output.data;

  // Hex to RGB helper
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const lineRGB = hexToRgb(settings.lineColor);

  const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
  const getLum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

  let grayBuffer = new Float32Array(width * height);

  // PASS 1: Grayscale & Contrast
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = contrastFactor * (r - 128) + 128 + settings.brightness;
    g = contrastFactor * (g - 128) + 128 + settings.brightness;
    b = contrastFactor * (b - 128) + 128 + settings.brightness;

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    grayBuffer[i / 4] = getLum(r, g, b);
  }

  // PASS 2: Smoothing
  if (settings.smoothing > 0) {
    const blurRadius = Math.floor(settings.smoothing);
    const newGray = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let by = -blurRadius; by <= blurRadius; by++) {
          for (let bx = -blurRadius; bx <= blurRadius; bx++) {
             const ny = y + by;
             const nx = x + bx;
             if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
               sum += grayBuffer[ny * width + nx];
               count++;
             }
          }
        }
        newGray[y * width + x] = sum / count;
      }
    }
    grayBuffer = newGray;
  }

  // PASS 3: Edge/Threshold
  const finalBuffer = new Uint8ClampedArray(width * height * 4);

  if (settings.mode === 'edge' || settings.mode === 'mixed') {
    const outputGray = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const gx = 
          -1 * grayBuffer[(y - 1) * width + (x - 1)] +
           1 * grayBuffer[(y - 1) * width + (x + 1)] +
          -2 * grayBuffer[y * width + (x - 1)] +
           2 * grayBuffer[y * width + (x + 1)] +
          -1 * grayBuffer[(y + 1) * width + (x - 1)] +
           1 * grayBuffer[(y + 1) * width + (x + 1)];

        const gy = 
          -1 * grayBuffer[(y - 1) * width + (x - 1)] +
          -2 * grayBuffer[(y - 1) * width + x] +
          -1 * grayBuffer[(y - 1) * width + (x + 1)] +
           1 * grayBuffer[(y + 1) * width + (x - 1)] +
           2 * grayBuffer[(y + 1) * width + x] +
           1 * grayBuffer[(y + 1) * width + (x + 1)];

        let magnitude = Math.sqrt(gx * gx + gy * gy);
        magnitude = magnitude * (settings.edgeIntensity / 20);
        outputGray[y * width + x] = magnitude;
      }
    }

    let dilatedGray = outputGray;
    if (settings.thickness > 1) {
       dilatedGray = new Float32Array(width * height);
       const radius = Math.floor(settings.thickness / 2);
       for(let y=0; y<height; y++){
         for(let x=0; x<width; x++){
            let maxVal = 0;
            for(let dy=-radius; dy<=radius; dy++){
              for(let dx=-radius; dx<=radius; dx++){
                 const ny = y+dy;
                 const nx = x+dx;
                 if(ny>=0 && ny<height && nx>=0 && nx<width){
                    maxVal = Math.max(maxVal, outputGray[ny*width+nx]);
                 }
              }
            }
            dilatedGray[y*width+x] = maxVal;
         }
       }
    }

    const threshold = settings.detail * 2.55; 
    
    for (let i = 0; i < width * height; i++) {
      let val = dilatedGray[i];
      let isLine = val > threshold;
      if (settings.mode === 'mixed') {
         const originalVal = grayBuffer[i] > 128 ? false : true;
         isLine = isLine || originalVal;
      }
      if (settings.invert) isLine = !isLine;

      if (isLine) {
        finalBuffer[i * 4] = lineRGB.r;
        finalBuffer[i * 4 + 1] = lineRGB.g;
        finalBuffer[i * 4 + 2] = lineRGB.b;
        finalBuffer[i * 4 + 3] = 255;
      } else {
        finalBuffer[i * 4] = 255;
        finalBuffer[i * 4 + 1] = 255;
        finalBuffer[i * 4 + 2] = 255;
        finalBuffer[i * 4 + 3] = 255; 
      }
    }

  } else if (settings.mode === 'threshold') {
    const threshold = settings.detail * 2.55;
    for (let i = 0; i < width * height; i++) {
      let val = grayBuffer[i];
      let isLine = val < threshold;
      if (settings.invert) isLine = !isLine;

      if (isLine) {
        finalBuffer[i * 4] = lineRGB.r;
        finalBuffer[i * 4 + 1] = lineRGB.g;
        finalBuffer[i * 4 + 2] = lineRGB.b;
        finalBuffer[i * 4 + 3] = 255;
      } else {
        finalBuffer[i * 4] = 255;
        finalBuffer[i * 4 + 1] = 255;
        finalBuffer[i * 4 + 2] = 255;
        finalBuffer[i * 4 + 3] = 255;
      }
    }
  }

  const renderData = output.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const readX = settings.flipX ? (width - 1 - x) : x;
      const readIdx = (y * width + readX) * 4;
      const writeIdx = (y * width + x) * 4;
      renderData[writeIdx] = finalBuffer[readIdx];
      renderData[writeIdx + 1] = finalBuffer[readIdx + 1];
      renderData[writeIdx + 2] = finalBuffer[readIdx + 2];
      renderData[writeIdx + 3] = finalBuffer[readIdx + 3];
    }
  }
  
  const warnings = settings.showThermalWarnings ? analyzeThermalIssues(imageData, output) : null;
  return { processed: output, thermalWarnings: warnings };
};

/**
 * Splits an image into a grid of parts with overlap and registration marks.
 */
export const segmentImage = (
  sourceCanvas: HTMLCanvasElement, 
  rows: number, 
  cols: number
): string[] => {
  const parts: string[] = [];
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  
  // 50px overlap for alignment
  const overlap = 50; 
  
  const segmentWidth = Math.ceil(width / cols);
  const segmentHeight = Math.ceil(height / rows);

  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Calculate dimensions with overlap
      const x = Math.max(0, c * segmentWidth - (c > 0 ? overlap : 0));
      const y = Math.max(0, r * segmentHeight - (r > 0 ? overlap : 0));
      
      // Determine actual draw width
      const w = Math.min(width - x, segmentWidth + (c > 0 ? overlap : 0) + (c < cols - 1 ? overlap : 0));
      const h = Math.min(height - y, segmentHeight + (r > 0 ? overlap : 0) + (r < rows - 1 ? overlap : 0));

      const partCanvas = document.createElement('canvas');
      partCanvas.width = w;
      partCanvas.height = h;
      const partCtx = partCanvas.getContext('2d');
      
      if (partCtx) {
        // Draw image section
        partCtx.fillStyle = '#FFFFFF';
        partCtx.fillRect(0, 0, w, h);
        partCtx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);

        // Draw Registration Marks (Red Crosshairs) at corners of overlap
        partCtx.strokeStyle = '#FF0000';
        partCtx.lineWidth = 1;
        partCtx.beginPath();
        
        // Draw marks if we are not on the absolute edges
        const markSize = 10;
        
        // Top-Left corner of this segment relative to the cut
        // We only draw if there was an overlap
        if (c > 0 || r > 0) {
           // Draw generic registration marks near corners
           // Top Left
           partCtx.moveTo(markSize, 0); partCtx.lineTo(markSize, markSize * 2);
           partCtx.moveTo(0, markSize); partCtx.lineTo(markSize * 2, markSize);
        }
        
        // Bottom Right
        partCtx.moveTo(w - markSize, h - markSize * 2); partCtx.lineTo(w - markSize, h);
        partCtx.moveTo(w - markSize * 2, h - markSize); partCtx.lineTo(w, h - markSize);

        partCtx.stroke();
      }
      
      parts.push(partCanvas.toDataURL('image/png'));
    }
  }
  return parts;
};
