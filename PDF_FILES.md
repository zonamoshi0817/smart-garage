# PDF生成・出力関連ファイル一覧

## PDF生成・出力関連ファイル一覧

### A) PDF生成（直接）

- `src/lib/pdfExport.ts`
  - 抜粋: `import jsPDF from 'jspdf';` / `import html2canvas from 'html2canvas';` / `const pdf = new jsPDF('p', 'mm', 'a4');` / `pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);` / `return pdf.output('blob');`
  - 生成方法: **jsPDF** + **html2canvas**（HTML→Canvas→PDF）

### B) HTML→画像/Canvas変換（PDF素材）

- `src/lib/pdfExport.ts`
  - 抜粋: `const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });` / `const imgData = canvas.toDataURL('image/png');` / `tempDiv.innerHTML = htmlContent;` / `document.body.appendChild(tempDiv);`
  - 分類根拠: **html2canvas**を使用してHTML要素をCanvas画像に変換（PDF生成の前処理）

### C) ダウンロード/保存/共有

- `src/lib/pdfExport.ts`
  - 抜粋: `const url = URL.createObjectURL(blob);` / `link.download = \`メンテナンス履歴_${options.car.name}_${new Date().toISOString().split('T')[0]}.pdf\`;` / `link.click();` / `URL.revokeObjectURL(url);`
  - 分類根拠: PDF Blobを`URL.createObjectURL`でURL化し、`<a>`要素の`download`属性でダウンロード

- `src/app/(app)/data/page.tsx`
  - 抜粋: `import { downloadMaintenancePDF, type PDFExportOptions } from "@/lib/pdfExport";` / `await downloadMaintenancePDF(options);` / `const url = URL.createObjectURL(blob);`
  - 分類根拠: `downloadMaintenancePDF`を呼び出してPDFダウンロードを実行

- `src/app/(app)/home/page.tsx`
  - 抜粋: `import { downloadMaintenancePDF, downloadBuildSheetPDF, type PDFExportOptions } from "@/lib/pdfExport";` / `await downloadMaintenancePDF(options);` / `await downloadBuildSheetPDF({ car, customizations, maintenanceRecords, publicUrl });`
  - 分類根拠: `downloadMaintenancePDF`と`downloadBuildSheetPDF`を呼び出してPDFダウンロードを実行

- `src/components/modals/ShareAndPDFModal.tsx`
  - 抜粋: `import { downloadMaintenancePDF, downloadBuildSheetPDF } from '@/lib/pdfExport';` / `await downloadMaintenancePDF({ car, maintenanceRecords });` / `await downloadBuildSheetPDF({ car, customizations, maintenanceRecords, publicUrl });`
  - 分類根拠: モーダル内でPDF生成・ダウンロード機能を提供

- `src/components/share/ShareContent.tsx`
  - 抜粋: `import { downloadMaintenancePDF } from "@/lib/pdfExport";` / `await downloadMaintenancePDF({ car, maintenanceRecords });`
  - 分類根拠: 共有コンテンツページでPDFダウンロード機能を提供

- `src/components/mycar/ShareAndPDF.tsx`
  - 抜粋: `onGeneratePDF: () => void;` / `<button onClick={onGeneratePDF}>📥 PDF発行</button>` / `全メンテナンス履歴・給油記録を証跡付きPDFで出力`
  - 分類根拠: PDF出力UIコンポーネント（実際の生成は親コンポーネント経由）

### D) 印刷（間接的）

- 該当なし（`window.print`、`@media print`等の使用は確認されませんでした）

---

## 依存関係（package.json）

PDF生成・出力に関連するnpmパッケージ：

- **jspdf**: `^3.0.3` - PDF生成ライブラリ
- **jspdf-autotable**: `^5.0.2` - jsPDF用のテーブル生成プラグイン（現在のコードでは未使用の可能性あり）
- **html2canvas**: `^1.4.1` - HTML要素をCanvas画像に変換するライブラリ

---

## 補足

### PDF生成の流れ

1. **HTMLコンテンツ生成** (`generateHTMLContent` / `generateBuildSheetHTML`)
   - メンテナンス履歴やカスタマイズ情報をHTML形式で生成

2. **HTML→Canvas変換** (`html2canvas`)
   - 一時的なDOM要素にHTMLを挿入
   - `html2canvas`でCanvas画像に変換

3. **Canvas→PDF変換** (`jsPDF`)
   - Canvas画像を`toDataURL('image/png')`でBase64データURLに変換
   - jsPDFでPDFを生成し、画像を追加
   - 複数ページ対応（ページ分割処理あり）

4. **PDFダウンロード** (`URL.createObjectURL` + `<a>`要素)
   - PDF Blobを`URL.createObjectURL`でURL化
   - `<a>`要素の`download`属性でファイル名を指定
   - `click()`でダウンロード実行
   - `URL.revokeObjectURL`でメモリ解放

### 主要なPDF生成関数

- `generateMaintenancePDF(options: PDFExportOptions): Promise<Blob>` - メンテナンス履歴PDF生成
- `downloadMaintenancePDF(options: PDFExportOptions): Promise<void>` - メンテナンス履歴PDF生成＋ダウンロード
- `generateBuildSheetPDF(options: BuildSheetPDFOptions): Promise<Blob>` - ビルドシートPDF生成
- `downloadBuildSheetPDF(options: BuildSheetPDFOptions): Promise<void>` - ビルドシートPDF生成＋ダウンロード

### 注意事項

- 秘密鍵・環境変数の値は一切記載していません
- 抜粋は最大5行に制限しています
- PDF生成はクライアントサイド（ブラウザ）で実行されます（`"use client"`ディレクティブ使用）
