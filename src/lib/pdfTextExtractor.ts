// src/lib/pdfTextExtractor.ts
"use client";

import * as pdfjsLib from 'pdfjs-dist';

// PDF.js Worker設定
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * PDFファイルからテキストを抽出
 * @param file PDFファイル
 * @returns 抽出されたテキスト（全ページ結合）
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('[PDF Extractor] Starting PDF text extraction...');
    
    // ファイルをArrayBufferとして読み込み
    const arrayBuffer = await file.arrayBuffer();
    
    // PDFドキュメントを読み込み
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`[PDF Extractor] PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = '';
    
    // 全ページのテキストを抽出
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // テキストアイテムを結合
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      console.log(`[PDF Extractor] Page ${pageNum} text extracted: ${pageText.length} characters`);
    }
    
    console.log(`[PDF Extractor] Total text extracted: ${fullText.length} characters`);
    return fullText;
  } catch (error) {
    console.error('[PDF Extractor] Error extracting text from PDF:', error);
    throw new Error('PDFからのテキスト抽出に失敗しました');
  }
}

/**
 * PDFの特定ページを画像としてレンダリング（OCR用）
 * @param file PDFファイル
 * @param pageNum ページ番号（1始まり）
 * @param scale スケール（デフォルト: 2.0）
 * @returns 画像のData URL
 */
export async function renderPDFPageToImage(
  file: File, 
  pageNum: number = 1, 
  scale: number = 2.0
): Promise<string> {
  try {
    console.log(`[PDF Extractor] Rendering page ${pageNum} to image...`);
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    if (pageNum > pdf.numPages) {
      throw new Error(`ページ番号が範囲外です: ${pageNum} > ${pdf.numPages}`);
    }
    
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    // Canvasを作成
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas context取得に失敗しました');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // ページをCanvasにレンダリング
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    console.log(`[PDF Extractor] Page ${pageNum} rendered to canvas`);
    
    // CanvasをData URLに変換
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('[PDF Extractor] Error rendering PDF page:', error);
    throw new Error('PDFページのレンダリングに失敗しました');
  }
}

/**
 * PDFから全ページを画像配列として取得（OCR用）
 * @param file PDFファイル
 * @param scale スケール（デフォルト: 2.0）
 * @returns 画像のData URL配列
 */
export async function renderPDFPagesToImages(
  file: File, 
  scale: number = 2.0
): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`[PDF Extractor] Rendering ${pdf.numPages} pages to images...`);
    
    const images: string[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const imageUrl = await renderPDFPageToImage(file, pageNum, scale);
      images.push(imageUrl);
    }
    
    console.log(`[PDF Extractor] All pages rendered: ${images.length} images`);
    return images;
  } catch (error) {
    console.error('[PDF Extractor] Error rendering PDF pages:', error);
    throw new Error('PDFページのレンダリングに失敗しました');
  }
}

/**
 * ファイルがPDFかどうかを判定
 * @param file ファイル
 * @returns PDFファイルかどうか
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

