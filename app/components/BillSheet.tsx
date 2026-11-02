export const SHOP_TAX = '3101701714063'
export const PROMPTPAY_ID = '0994102559'

export const BRANCH_INFO = [
  { key: 'เจ้าฟ้า', title: 'รัษฎาแอร์ เจ้าฟ้าสวนหลวง', address: 'ถนนเจ้าฟ้าสวนหลวง ตำบลวิชิต อำเภอเมืองภูเก็ต จังหวัดภูเก็ต', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: 'ท่าเรือ', title: 'รัษฎาแอร์ ท่าเรือ', address: '56/6 หมู่ที่ 5 ถนนเทพกระษัตรี ตำบลศรีสุนทร อำเภอถลาง จังหวัดภูเก็ต 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: 'สนามบิน', title: 'รัษฎาแอร์ สนามบิน', address: '201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: 'กู้กู', title: 'รัษฎาแอร์ กู้กู', address: '63/20 หมู่ที่ 3 ถนนร่วมพัฒนา ตำบลรัษฎา อำเภอเมือง จังหวัดภูเก็ต 83000', phone: '099-4102559 , 084-3057559', email: 'ratsada_air@hotmail.com' },
]

export const DOC_TYPES = [
  { id: 'receipt', title: 'ใบเสร็จรับเงิน/Receipt' },
  { id: 'delivery', title: 'ใบส่งของ/Delivery Bill' },
  { id: 'deposit', title: 'ใบรับเงินมัดจำ/Receive Deposit' },
  { id: 'quotation', title: 'ใบเสนอราคา/Quotation' },
]

export const PAY_TYPES = [
  { id: 'cash', label: 'เงินสด' },
  { id: 'transfer', label: 'โอน' },
  { id: 'cheque', label: 'เช็ค' },
  { id: 'credit', label: 'ลูกหนี้เครดิต' },
]

export function branchInfo(name: string) {
  return BRANCH_INFO.find((item) => name && (name.includes(item.key) || item.title === name)) || null
}

export function parseMeta(note: string) {
  const raw = String(note || '')
  const mark = raw.indexOf('[[meta]]')
  if (mark < 0) return { text: raw, meta: {} as any }
  try {
    return { text: raw.slice(0, mark).trim(), meta: JSON.parse(raw.slice(mark + 8)) }
  } catch {
    return { text: raw, meta: {} as any }
  }
}

export type BillView = {
  title: string
  address: string
  phone: string
  email: string
  docTitle: string
  billNo: string
  dateText: string
  customerType: string
  customer: string
  customerPhone: string
  customerTax: string
  plate: string
  car: string
  mileage: string
  technician: string
  payLabel: string
  chequeNo: string
  items: { name: string; qty: number; price: number }[]
  discount: number
  total: number
  note: string
  showQr: boolean
}

export default function BillSheet({ bill }: { bill: BillView }) {
  const subtotal = bill.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0)
  const total = Number(bill.total ?? Math.max(0, subtotal - Number(bill.discount || 0)))
  const qr = bill.showQr && total > 0
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`https://promptpay.io/${PROMPTPAY_ID}/${total}`)}`
    : ''
  const blanks = Math.max(0, Math.min(12, 12 - bill.items.length))

  return (
    <div className="bill-sheet">
      <div className="head">
        <img src="/ratsada-logo.png" alt="RATSADA" className="logo" />
        <div className="shop">
          <h1>{bill.title || 'รัษฎาแอร์'}</h1>
          <p>{bill.address}</p>
          <p>Tel. {bill.phone} &nbsp; Email. {bill.email}</p>
          {bill.customerType === 'company' && <p>เลขประจำตัวผู้เสียภาษีอากร {SHOP_TAX}</p>}
        </div>
      </div>
      <h2>{bill.docTitle}</h2>
      <div className="meta">
        <div>
          <div>ลูกค้า: {bill.customer || '-'}</div>
          <div>โทร: {bill.customerPhone || '-'}</div>
          {bill.customerType === 'company' && <div>เลขผู้เสียภาษีลูกค้า: {bill.customerTax || '-'}</div>}
          <div>ทะเบียน: {bill.plate || '-'} &nbsp; รุ่น: {bill.car || '-'}</div>
          <div>เลขไมล์: {bill.mileage || '-'} &nbsp; ช่าง: {bill.technician || '-'}</div>
        </div>
        <div className="right">
          <div>เลขที่ {bill.billNo}</div>
          <div>{bill.dateText}</div>
          <div>ชำระโดย: {bill.payLabel}</div>
          {bill.chequeNo ? <div>เลขที่เช็ค: {bill.chequeNo}</div> : null}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th className="c" style={{ width: 36 }}>ลำดับ</th>
            <th>รายการ</th>
            <th className="c" style={{ width: 64 }}>จำนวน</th>
            <th className="r" style={{ width: 80 }}>ราคา</th>
            <th className="r" style={{ width: 90 }}>จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, index) => (
            <tr key={index}>
              <td className="c">{index + 1}</td>
              <td>{item.name}</td>
              <td className="c">{item.qty}</td>
              <td className="r">{Number(item.price || 0).toLocaleString()}</td>
              <td className="r">{(Number(item.price || 0) * Number(item.qty || 1)).toLocaleString()}</td>
            </tr>
          ))}
          {Array.from({ length: blanks }).map((_, index) => (
            <tr key={`b${index}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
          ))}
        </tbody>
      </table>
      <div className="foot">
        <div>
          {qr && (
            <div className="qr">
              <img src={qr} alt="PromptPay" width={78} height={78} />
              <div>สแกนจ่าย {total.toLocaleString()} บาท</div>
            </div>
          )}
          {bill.note ? <div className="note">หมายเหตุ: {bill.note}</div> : null}
        </div>
        <div className="sum">
          <div>ยอดรวม: {subtotal.toLocaleString()} บาท</div>
          <div>ส่วนลด: {Number(bill.discount || 0).toLocaleString()} บาท</div>
          <div className="grand">รวมทั้งสิ้น: {total.toLocaleString()} บาท</div>
        </div>
      </div>
      <div className="signs">
        <div><i></i>ผู้รับบริการ</div>
        <div><i></i>ช่างผู้ปฏิบัติ</div>
        <div><i></i>ผู้รับเงิน</div>
      </div>
    </div>
  )
}
