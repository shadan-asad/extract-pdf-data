declare module 'pdf2img' {
  interface ConvertOptions {
    type?: string;
    density?: number;
    quality?: number;
    outputdir?: string;
    outputname?: string;
    width?: number;
    height?: number;
  }

  interface PDFInfo {
    pages: number;
    width: number;
    height: number;
  }

  interface PDF2Img {
    convert: (input: string, options: ConvertOptions, callback?: (err: Error | null, images: Buffer[]) => void) => Promise<Buffer[]>;
    info: (input: string, callback?: (err: Error | null, info: PDFInfo) => void) => Promise<PDFInfo>;
  }

  const pdf2img: PDF2Img;
  export default pdf2img;
} 