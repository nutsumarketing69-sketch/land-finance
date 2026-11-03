declare module 'xlsx' {
  export function read(data: ArrayBuffer, opts: { type: 'array'; cellDates?: boolean }): {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }
  export const utils: {
    sheet_to_json<T>(sheet: unknown, opts?: { defval?: string; raw?: boolean }): T[]
  }
}
