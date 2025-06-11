declare module 'pdf-poppler' {
  interface ConvertOptions {
    format?: string;
    out_dir?: string;
    out_prefix?: string;
    page?: number;
    scale?: number;
    dpi?: number;
  }

  export function convert(input: string, options: ConvertOptions): Promise<void>;
} 