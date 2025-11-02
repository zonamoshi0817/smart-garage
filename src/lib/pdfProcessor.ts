// src/lib/pdfProcessor.ts
"use client";

import { pdfjs } from 'react-pdf';

// PDF.js Workerの設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/**
 * PDFファイルからテキストを抽出
 * @param file PDFファイル
 * @returns 抽出されたテキスト
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('[PDF Processor] Starting text extraction...');
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`[PDF Processor] PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = '';
    
    // 全ページからテキストを抽出
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      console.log(`[PDF Processor] Page ${pageNum}: ${pageText.length} chars`);
    }
    
    console.log(`[PDF Processor] Total text: ${fullText.length} chars`);
    return fullText;
  } catch (error) {
    console.error('[PDF Processor] Error:', error);
    throw new Error('PDFからのテキスト抽出に失敗しました');
  }
}

/**
 * PDFページを画像としてレンダリング（OCR用）
 * @param file PDFファイル
 * @param pageNum ページ番号（1始まり）
 * @param scale スケール
 * @returns 画像データURL
 */
export async function renderPDFPageToImage(
  file: File,
  pageNum: number = 1,
  scale: number = 2.0
): Promise<string> {
  try {
    console.log(`[PDF Processor] Rendering page ${pageNum}...`);
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    if (pageNum > pdf.numPages) {
      throw new Error(`ページ番号が範囲外: ${pageNum} > ${pdf.numPages}`);
    }
    
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    // Canvasを作成
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas context取得失敗');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // レンダリング
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    console.log(`[PDF Processor] Page ${pageNum} rendered`);
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('[PDF Processor] Render error:', error);
    throw new Error('PDFページのレンダリングに失敗しました');
  }
}

/**
 * ファイルがPDFかどうかを判定
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

