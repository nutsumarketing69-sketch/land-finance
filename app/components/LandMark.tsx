/** เครื่องหมายโฉนดสีทองและมรกต วาดในหน้า ไม่ดึงไฟล์รูปจากภายนอก */
export default function LandMark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" aria-hidden="true">
        <rect width="48" height="48" rx="14" fill="#022c22" />
        <rect x="11" y="8" width="22" height="30" rx="3" fill="#f6e2b3" />
        <path d="M25 8.6h7.2L33.2 16H25z" fill="#d4a017" />
        <path d="M16 28.5 19.6 24.6l2.8 2.2 3.6-4.4 3.2 2.8V33H16z" fill="#059669" />
      </svg>
      <svg viewBox="0 0 168 44" className="h-10 w-auto" role="img" aria-label="ขายฝาก">
        <text x="0" y="32" fill="#f6e2b3" fontSize="30" fontWeight="700" fontFamily="inherit">
          ขายฝาก
        </text>
      </svg>
    </div>
  );
}
