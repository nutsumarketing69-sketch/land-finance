/** เครื่องหมายขายฝากที่วาดในหน้า ไม่ดึงไฟล์รูปจากภายนอก */
export default function LandMark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" aria-hidden="true">
        <rect width="48" height="48" rx="14" fill="#020617" />
        <rect x="10" y="7" width="24" height="31" rx="3" fill="#0f172a" stroke="#f6e2b3" strokeWidth="1.6" />
        <path d="M26 7.8h7.2L34.2 15H26z" fill="#f6e2b3" />
        <path d="M15 27.2 19.4 22.4l3.4 2.8 4.4-5.4 3.6 3.4V32H15z" fill="#6ee7b7" />
        <path d="M15 34.4h18" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 168 44" className="h-10 w-auto" role="img" aria-label="ขายฝาก">
        <text
          x="0"
          y="32"
          fill="#f8fafc"
          fontSize="30"
          fontWeight="700"
          fontFamily="inherit"
        >
          ขายฝาก
        </text>
      </svg>
    </div>
  );
}
