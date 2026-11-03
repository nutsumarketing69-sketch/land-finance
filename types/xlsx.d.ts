declare module 'xlsx' {
  export function read(data: ArrayBuffer, opts: { type: 'array'; cellDates?: boolean }): {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }
  export function writeFile(book: unknown, filename: string): void
  export const utils: {
    sheet_to_json<T>(sheet: unknown, opts?: { defval?: string; raw?: boolean }): T[]
    book_new(): { SheetNames: string[]; Sheets: Record<string, unknown> }
    aoa_to_sheet(rows: unknown[][]): { '!cols'?: { wch: number }[]; '!autofilter'?: { ref: string }; '!ref'?: string }
    book_append_sheet(book: unknown, sheet: unknown, name: string): void
  }
}
// backup workbook is written from these helpers
