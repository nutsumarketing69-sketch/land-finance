'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Line = { name: string; qty: number; price: number }

const SHOP_TAX = '3101701714063'
const PROMPTPAY_ID = '0994102559'
const PROMPTPAY_TEXT = '099-410-2559'

const BRANCH_BOOK = [
  { key: '???????', title: '????????? ??????????????', address: '????????????????? ????????? ???????????????? ?????????????', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '???????', title: '????????? ???????', address: '56/6 ??????? 5 ?????????????? ???????????? ????????? ????????????? 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '???????', title: '????????? ???????', address: '201/2 ??????? 5 ??????????????????? ??????????????? ????????? ????????????? 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '?????', title: '????????? ?????', address: '63/20 ??????? 3 ???????????? ????????? ?????????? ????????????? 83000', phone: '099-4102559 , 084-3057559', email: 'ratsada_air@hotmail.com' },
]

const DOC_TYPES = [
  { id: 'receipt', title: '??????????????/Receipt' },
  { id: 'delivery', title: '????????/Delivery Bill' },
  { id: 'deposit', title: '??????????????/Receive Deposit' },
  { id: 'quotation', title: '??????????/Quotation' },
]

const PAY_TYPES = [
  { id: 'cash', label: '??????' },
  { id: 'transfer', label: '???' },
  { id: 'cheque', label: '????' },
  { id: 'credit', label: '?????????????' },
]

const BRANDS: Record<string, string[]> = {
  Toyota: ['Vios', 'Yaris', 'Yaris Ativ', 'Corolla Altis', 'Corolla Cross', 'Camry', 'Fortuner', 'Hilux Revo', 'Hilux Vigo', 'Commuter', 'Hiace', 'Innova', 'Alphard', 'Veloz', 'C-HR', 'Raize', 'Avanza'],
  Honda: ['City', 'Civic', 'Jazz', 'Accord', 'HR-V', 'CR-V', 'BR-V', 'Freed', 'Brio', 'Mobilio', 'Odyssey'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'BT-50'],
  Nissan: ['Almera', 'March', 'Note', 'Teana', 'Navara', 'Terra', 'X-Trail', 'Urvan'],
  Mitsubishi: ['Attrage', 'Mirage', 'Lancer', 'Pajero Sport', 'Triton', 'Xpander'],
  Isuzu: ['D-Max', 'MU-X', 'MU-7'],
  Ford: ['Ranger', 'Everest', 'Focus', 'Fiesta'],
  Chevrolet: ['Colorado', 'Trailblazer', 'Captiva', 'Cruze'],
  Suzuki: ['Swift', 'Ciaz', 'Ertiga', 'XL7', 'Carry'],
  MG: ['MG3', 'MG5', 'ZS', 'HS', 'Extender'],
  Hyundai: ['H-1', 'Staria', 'Tucson', 'Creta'],
  Kia: ['Carnival', 'Sportage', 'Seltos'],
  BMW: ['Series 3', 'Series 5', 'X1', 'X3', 'X5'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLC', 'Vito'],
  Lexus: ['NX', 'RX', 'ES', 'IS'],
  Subaru: ['XV', 'Forester', 'Outback'],
}

const COLORS = ['???', '??', '???', '????', '???', '???????', '??????', '???', '?????', '??????', '???', '???']

function blank(): Line {
  return { name: '', qty: 1, price: 0 }
}

function fit(value: string, min = 4) {
  return { width: `${Math.max(min, value.length + 1)}ch` }
}

function isoToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function thaiDateOnly(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = date.getFullYear() + 543
  return `${dd}/${mm}/${yy}`
}

function thaiFromIso(iso: string) {
  if (!iso || iso.length < 10) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${Number(year) + 543}`
}

function crc16(data: string) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function promptPay(id: string, amount: number) {
  const numbers = id.replace(/\D/g, '')
  const target = numbers.length >= 13 ? numbers : ('0000000000000' + numbers.replace(/^0/, '66')).slice(-13)
  const targetType = numbers.length >= 15 ? '03' : numbers.length >= 13 ? '02' : '01'
  const field = (tag: string, value: string) => tag + String(value.length).padStart(2, '0') + value
  const merchant = field('00', 'A000000677010111') + field(targetType, target)
  const amountText = amount > 0 ? amount.toFixed(2) : ''
  const body = [
    field('00', '01'),
    field('01', amountText ? '12' : '11'),
    field('29', merchant),
    field('58', 'TH'),
    field('53', '764'),
    amountText ? field('54', amountText) : '',
  ].join('')
  const data = body + '6304'
  return data + crc16(data)
}

async function nextBillNo(supabase: any) {
  const now = new Date()
  const prefix = `${String(now.getFullYear() + 543).slice(-2)}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-`
  const res = await supabase.from('bills').select('bill_no').ilike('bill_no', `${prefix}%`).limit(200)
  let max = 0
  for (const row of res.data || []) {
    const n = Number(String(row.bill_no || '').split('-').pop())
    if (Number.isFinite(n) && n > max) max = n
  }
  return prefix + String(max + 1).padStart(3, '0')
}

function bahtText(amount: number) {
  const digits = ['', '?????', '???', '???', '???', '???', '??', '????', '???', '????']
  const units = ['', '???', '????', '???', '?????', '???']
  const group = (num: number): string => {
    if (num >= 1000000) return group(Math.floor(num / 1000000)) + '????' + group(num % 1000000)
    const s = String(num)
    let out = ''
    for (let i = 0; i < s.length; i++) {
      const d = Number(s[i])
      const p = s.length - i - 1
      if (!d) continue
      if (p === 1 && d === 1) out += '???'
      else if (p === 1 && d === 2) out += '??????'
      else if (p === 0 && d === 1 && s.length > 1) out += '????'
      else out += digits[d] + units[p]
    }
    return out
  }
  const n = Math.round(Math.abs(Number(amount || 0)) * 100)
  const baht = Math.floor(n / 100)
  const satang = n % 100
  if (!baht && !satang) return '????????????'
  return `${baht ? group(baht) + '???' : ''}${satang ? group(satang) + '??????' : '????'}`
}

function readAge(data: any): number | null {
  if (typeof data === 'number') return data
  if (typeof data === 'string' && data !== '' && !Number.isNaN(Number(data))) return Number(data)
  if (Array.isArray(data)) return readAge(data[0])
  if (data && typeof data === 'object') {
    const value = data.age_seconds ?? data.age ?? data.seconds ?? data.printer_age
    if (value != null && !Number.isNaN(Number(value))) return Number(value)
  }
  return null
}

export default function ReceiptPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [docType, setDocType] = useState('receipt')
  const [customerType, setCustomerType] = useState('general')
  const [payType, setPayType] = useState('cash')
  const [chequeNo, setChequeNo] = useState('')
  const [technician, setTechnician] = useState('')
  const [signDate, setSignDate] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState(0)
  const [billNo, setBillNo] = useState('')
  const [dateText, setDateText] = useState('')
  const [customer, setCustomer] = useState('')
  const [customerHits, setCustomerHits] = useState<any[]>([])
  const [phone, setPhone] = useState('')
  const [customerTax, setCustomerTax] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [plate, setPlate] = useState('')
  const [plateHits, setPlateHits] = useState<any[]>([])
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [brandOpen, setBrandOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [color, setColor] = useState('')
  const [mileage, setMileage] = useState('')
  const [items, setItems] = useState<Line[]>([blank(), blank(), blank(), blank(), blank()])
  const [partFocus, setPartFocus] = useState(-1)
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [savedId, setSavedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [printerText, setPrinterText] = useState('???????????????')
  const [printerOn, setPrinterOn] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      const supabase = createClient()
      const branchRes = await supabase.from('branches').select('*').order('name')
      const employeeRes = await supabase.from('employees').select('*').limit(300)
      const partRes = await supabase.from('parts_services').select('id, name, price, stock').order('name').limit(800)
      const number = await nextBillNo(supabase)
      if (!alive) return
      setBranches(branchRes.data || [])
      setEmployees(employeeRes.data || [])
      setParts(partRes.data || [])
      setBillNo(number)
      setDateText(thaiDateOnly())
      setSignDate(isoToday())
      try {
        const draft = JSON.parse(localStorage.getItem('receiveDraft') || 'null')
        if (draft) {
          setCustomer(draft.customer || '')
          setPhone(draft.phone || '')
          setPlate(draft.plate || '')
          setModel(draft.car || '')
          setMileage(draft.mileage || '')
          if (draft.note) setNote(draft.note)
        }
        const picked = JSON.parse(localStorage.getItem('selectedItems') || '[]')
        if (Array.isArray(picked) && picked.length) {
          const lines = picked.slice(0, 16).map((item: any) => ({
            name: String(item.name || ''),
            qty: Number(item.qty || 1),
            price: Number(item.price || 0),
          }))
          while (lines.length < 5) lines.push(blank())
          setItems(lines)
          localStorage.removeItem('selectedItems')
        }
      } catch {}
    }
    ru'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Line = { name: string; qty: number; price: number }

const SHOP_TAX = '3101701714063'
const PROMPTPAY_ID = '0994102559'
const PROMPTPAY_TEXT = '099-410-2559'

const BRANCH_BOOK = [
  { key: '???????', title: '????????? ??????????????', address: '????????????????? ????????? ???????????????? ?????????????', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '???????', title: '????????? ???????', address: '56/6 ??????? 5 ?????????????? ???????????? ????????? ????????????? 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '???????', title: '????????? ???????', address: '201/2 ??????? 5 ??????????????????? ??????????????? ????????? ????????????? 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '?????', title: '????????? ?????', address: '63/20 ??????? 3 ???????????? ????????? ?????????? ????????????? 83000', phone: '099-4102559 , 084-3057559', email: 'ratsada_air@hotmail.com' },
]

const DOC_TYPES = [
  { id: 'receipt', title: '??????????????/Receipt' },
  { id: 'delivery', title: '????????/Delivery Bill' },
  { id: 'deposit', title: '??????????????/Receive Deposit' },
  { id: 'quotation', title: '??????????/Quotation' },
]

const PAY_TYPES = [
  { id: 'cash', label: '??????' },
  { id: 'transfer', label: '???' },
  { id: 'cheque', label: '????' },
  { id: 'credit', label: '?????????????' },
]

const BRANDS: Record<string, string[]> = {
  Toyota: ['Vios', 'Yaris', 'Yaris Ativ', 'Corolla Altis', 'Corolla Cross', 'Camry', 'Fortuner', 'Hilux Revo', 'Hilux Vigo', 'Commuter', 'Hiace', 'Innova', 'Alphard', 'Veloz', 'C-HR', 'Raize', 'Avanza'],
  Honda: ['City', 'Civic', 'Jazz', 'Accord', 'HR-V', 'CR-V', 'BR-V', 'Freed', 'Brio', 'Mobilio', 'Odyssey'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'BT-50'],
  Nissan: ['Almera', 'March', 'Note', 'Teana', 'Navara', 'Terra', 'X-Trail', 'Urvan'],
  Mitsubishi: ['Attrage', 'Mirage', 'Lancer', 'Pajero Sport', 'Triton', 'Xpander'],
  Isuzu: ['D-Max', 'MU-X', 'MU-7'],
  Ford: ['Ranger', 'Everest', 'Focus', 'Fiesta'],
  Chevrolet: ['Colorado', 'Trailblazer', 'Captiva', 'Cruze'],
  Suzuki: ['Swift', 'Ciaz', 'Ertiga', 'XL7', 'Carry'],
  MG: ['MG3', 'MG5', 'ZS', 'HS', 'Extender'],
  Hyundai: ['H-1', 'Staria', 'Tucson', 'Creta'],
  Kia: ['Carnival', 'Sportage', 'Seltos'],
  BMW: ['Series 3', 'Series 5', 'X1', 'X3', 'X5'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLC', 'Vito'],
  Lexus: ['NX', 'RX', 'ES', 'IS'],
  Subaru: ['XV', 'Forester', 'Outback'],
}

const COLORS = ['???', '??', '???', '????', '???', '???????', '??????', '???', '?????', '??????', '???', '???']

function blank(): Line {
  return { name: '', qty: 1, price: 0 }
}

function fit(value: string, min = 4) {
  return { width: `${Math.max(min, value.length + 1)}ch` }
}

function isoToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function thaiDateOnly(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = date.getFullYear() + 543
  return `${dd}/${mm}/${yy}`
}

function thaiFromIso(iso: string) {
  if (!iso || iso.length < 10) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${Number(year) + 543}`
}

function crc16(data: string) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function promptPay(id: string, amount: number) {
  const numbers = id.replace(/\D/g, '')
  const target = numbers.length >= 13 ? numbers : ('0000000000000' + numbers.replace(/^0/, '66')).slice(-13)
  const targetType = numbers.length >= 15 ? '03' : numbers.length >= 13 ? '02' : '01'
  const field = (tag: string, value: string) => tag + String(value.length).padStart(2, '0') + value
  const merchant = field('00', 'A000000677010111') + field(targetType, target)
  const amountText = amount > 0 ? amount.toFixed(2) : ''
  const body = [
    field('00', '01'),
    field('01', amountText ? '12' : '11'),
    field('29', merchant),
    field('58', 'TH'),
    field('53', '764'),
    amountText ? field('54', amountText) : '',
  ].join('')
  const data = body + '6304'
  return data + crc16(data)
}

async function nextBillNo(supabase: any) {
  const now = new Date()
  const prefix = `${String(now.getFullYear() + 543).slice(-2)}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-`
  const res = await supabase.from('bills').select('bill_no').ilike('bill_no', `${prefix}%`).limit(200)
  let max = 0
  for (const row of res.data || []) {
    const n = Number(String(row.bill_no || '').split('-').pop())
    if (Number.isFinite(n) && n > max) max = n
  }
  return prefix + String(max + 1).padStart(3, '0')
}

function bahtText(amount: number) {
  const digits = ['', '?????', '???', '???', '???', '???', '??', '????', '???', '????']
  const units = ['', '???', '????', '???', '?????', '???']
  const group = (num: number): string => {
    if (num >= 1000000) return group(Math.floor(num / 1000000)) + '????' + group(num % 1000000)
    const s = String(num)
    let out = ''
    for (let i = 0; i < s.length; i++) {
      const d = Number(s[i])
      const p = s.length - i - 1
      if (!d) continue
      if (p === 1 && d === 1) out += '???'
      else if (p === 1 && d === 2) out += '??????'
      else if (p === 0 && d === 1 && s.length > 1) out += '????'
      else out += digits[d] + units[p]
    }
    return out
  }
  const n = Math.round(Math.abs(Number(amount || 0)) * 100)
  const baht = Math.floor(n / 100)
  const satang = n % 100
  if (!baht && !satang) return '????????????'
  return `${baht ? group(baht) + '???' : ''}${satang ? group(satang) + '??????' : '????'}`
}

function readAge(data: any): number | null {
  if (typeof data === 'number') return data
  if (typeof data === 'string' && data !== '' && !Number.isNaN(Number(data))) return Number(data)
  if (Array.isArray(data)) return readAge(data[0])
  if (data && typeof data === 'object') {
    const value = data.age_seconds ?? data.age ?? data.seconds ?? data.printer_age
    if (value != null && !Number.isNaN(Number(value))) return Number(value)
  }
  return null
}

export default function ReceiptPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [docType, setDocType] = useState('receipt')
  const [customerType, setCustomerType] = useState('general')
  const [payType, setPayType] = useState('cash')
  const [chequeNo, setChequeNo] = useState('')
  const [technician, setTechnician] = useState('')
  const [signDate, setSignDate] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState(0)
  const [billNo, setBillNo] = useState('')
  const [dateText, setDateText] = useState('')
  const [customer, setCustomer] = useState('')
  const [customerHits, setCustomerHits] = useState<any[]>([])
  const [phone, setPhone] = useState('')
  const [customerTax, setCustomerTax] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [plate, setPlate] = useState('')
  const [plateHits, setPlateHits] = useState<any[]>([])
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [brandOpen, setBrandOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [color, setColor] = useState('')
  const [mileage, setMileage] = useState('')
  const [items, setItems] = useState<Line[]>([blank(), blank(), blank(), blank(), blank()])
  const [partFocus, setPartFocus] = useState(-1)
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [savedId, setSavedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [printerText, setPrinterText] = useState('???????????????')
  const [printerOn, setPrinterOn] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      const supabase = createClient()
      const branchRes = await supabase.from('branches').select('*').order('name')
      const employeeRes = await supabase.from('employees').select('*').limit(300)
      const partRes = await supabase.from('parts_services').select('id, name, price, stock').order('name').limit(800)
      const number = await nextBillNo(supabase)
      if (!alive) return
      setBranches(branchRes.data || [])
      setEmployees(employeeRes.data || [])
      setParts(partRes.data || [])
      setBillNo(number)
      setDateText(thaiDateOnly())
      setSignDate(isoToday())
      try {
        const draft = JSON.parse(localStorage.getItem('receiveDraft') || 'null')
        if (draft) {
          setCustomer(draft.customer || '')
          setPhone(draft.phone || '')
          setPlate(draft.plate || '')
          setModel(draft.car || '')
          setMileage(draft.mileage || '')
          if (draft.note) setNote(draft.note)
        }
        const picked = JSON.parse(localStorage.getItem('selectedItems') || '[]')
        if (Array.isArray(picked) && picked.length) {
          const lines = picked.slice(0, 16).map((item: any) => ({
            name: String(item.name || ''),
            qty: Number(item.qty || 1),
            price: Number(item.price || 0),
          }))
          while (lines.length < 5) lines.push(blank())
          setItems(lines)
          localStorage.removeItem('selectedItems')
        }
      } catch {}
    }
    ru'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Line = { name: string; qty: number; price: number }

const SHOP_TAX = '3101701714063'
const PROMPTPAY_ID = '0994102559'
const PROMPTPAY_TEXT = '099-410-2559'

const BRANCH_BOOK = [
  { key: '???????', title: '????????? ??????????????', address: '????????????????? ????????? ???????????????? ?????????????', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '???????', title: '????????? ???????', address: '56/6 ??????? 5 ?????????????? ???????????? ????????? ????????????? 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '???????', title: '????????? ???????', address: '201/2 ??????? 5 ??????????????????? ??????????????? ????????? ????????????? 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '?????', title: '????????? ?????', address: '63/20 ??????? 3 ???????????? ????????? ?????????? ????????????? 83000', phone: '099-4102559 , 084-3057559', email: 'ratsada_air@hotmail.com' },
]

const DOC_TYPES = [
  { id: 'receipt', title: '??????????????/Receipt' },
  { id: 'delivery', title: '????????/Delivery Bill' },
  { id: 'deposit', title: '??????????????/Receive Deposit' },
  { id: 'quotation', title: '??????????/Quotation' },
]

const PAY_TYPES = [
  { id: 'cash', label: '??????' },
  { id: 'transfer', label: '???' },
  { id: 'cheque', label: '????' },
  { id: 'credit', label: '?????????????' },
]

const BRANDS: Record<string, string[]> = {
  Toyota: ['Vios', 'Yaris', 'Yaris Ativ', 'Corolla Altis', 'Corolla Cross', 'Camry', 'Fortuner', 'Hilux Revo', 'Hilux Vigo', 'Commuter', 'Hiace', 'Innova', 'Alphard', 'Veloz', 'C-HR', 'Raize', 'Avanza'],
  Honda: ['City', 'Civic', 'Jazz', 'Accord', 'HR-V', 'CR-V', 'BR-V', 'Freed', 'Brio', 'Mobilio', 'Odyssey'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'BT-50'],
  Nissan: ['Almera', 'March', 'Note', 'Teana', 'Navara', 'Terra', 'X-Trail', 'Urvan'],
  Mitsubishi: ['Attrage', 'Mirage', 'Lancer', 'Pajero Sport', 'Triton', 'Xpander'],
  Isuzu: ['D-Max', 'MU-X', 'MU-7'],
  Ford: ['Ranger', 'Everest', 'Focus', 'Fiesta'],
  Chevrolet: ['Colorado', 'Trailblazer', 'Captiva', 'Cruze'],
  Suzuki: ['Swift', 'Ciaz', 'Ertiga', 'XL7', 'Carry'],
  MG: ['MG3', 'MG5', 'ZS', 'HS', 'Extender'],
  Hyundai: ['H-1', 'Staria', 'Tucson', 'Creta'],
  Kia: ['Carnival', 'Sportage', 'Seltos'],
  BMW: ['Series 3', 'Series 5', 'X1', 'X3', 'X5'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLC', 'Vito'],
  Lexus: ['NX', 'RX', 'ES', 'IS'],
  Subaru: ['XV', 'Forester', 'Outback'],
}

const COLORS = ['???', '??', '???', '????', '???', '???????', '??????', '???', '?????', '??????', '???', '???']

function blank(): Line {
  return { name: '', qty: 1, price: 0 }
}

function fit(value: string, min = 4) {
  return { width: `${Math.max(min, value.length + 1)}ch` }
}

function isoToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function thaiDateOnly(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = date.getFullYear() + 543
  return `${dd}/${mm}/${yy}`
}

function thaiFromIso(iso: string) {
  if (!iso || iso.length < 10) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${Number(year) + 543}`
}

function crc16(data: string) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function promptPay(id: string, amount: number) {
  const numbers = id.replace(/\D/g, '')
  const target = numbers.length >= 13 ? numbers : ('0000000000000' + numbers.replace(/^0/, '66')).slice(-13)
  const targetType = numbers.length >= 15 ? '03' : numbers.length >= 13 ? '02' : '01'
  const field = (tag: string, value: string) => tag + String(value.length).padStart(2, '0') + value
  const merchant = field('00', 'A000000677010111') + field(targetType, target)
  const amountText = amount > 0 ? amount.toFixed(2) : ''
  const body = [
    field('00', '01'),
    field('01', amountText ? '12' : '11'),
    field('29', merchant),
    field('58', 'TH'),
    field('53', '764'),
    amountText ? field('54', amountText) : '',
  ].join('')
  const data = body + '6304'
  return data + crc16(data)
}

async function nextBillNo(supabase: any) {
  const now = new Date()
  const prefix = `${String(now.getFullYear() + 543).slice(-2)}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-`
  const res = await supabase.from('bills').select('bill_no').ilike('bill_no', `${prefix}%`).limit(200)
  let max = 0
  for (const row of res.data || []) {
    const n = Number(String(row.bill_no || '').split('-').pop())
    if (Number.isFinite(n) && n > max) max = n
  }
  return prefix + String(max + 1).padStart(3, '0')
}

function bahtText(amount: number) {
  const digits = ['', '?????', '???', '???', '???', '???', '??', '????', '???', '????']
  const units = ['', '???', '????', '???', '?????', '???']
  const group = (num: number): string => {
    if (num >= 1000000) return group(Math.floor(num / 1000000)) + '????' + group(num % 1000000)
    const s = String(num)
    let out = ''
    for (let i = 0; i < s.length; i++) {
      const d = Number(s[i])
      const p = s.length - i - 1
      if (!d) continue
      if (p === 1 && d === 1) out += '???'
      else if (p === 1 && d === 2) out += '??????'
      else if (p === 0 && d === 1 && s.length > 1) out += '????'
      else out += digits[d] + units[p]
    }
    return out
  }
  const n = Math.round(Math.abs(Number(amount || 0)) * 100)
  const baht = Math.floor(n / 100)
  const satang = n % 100
  if (!baht && !satang) return '????????????'
  return `${baht ? group(baht) + '???' : ''}${satang ? group(satang) + '??????' : '????'}`
}

function readAge(data: any): number | null {
  if (typeof data === 'number') return data
  if (typeof data === 'string' && data !== '' && !Number.isNaN(Number(data))) return Number(data)
  if (Array.isArray(data)) return readAge(data[0])
  if (data && typeof data === 'object') {
    const value = data.age_seconds ?? data.age ?? data.seconds ?? data.printer_age
    if (value != null && !Number.isNaN(Number(value))) return Number(value)
  }
  return null
}

export default function ReceiptPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [docType, setDocType] = useState('receipt')
  const [customerType, setCustomerType] = useState('general')
  const [payType, setPayType] = useState('cash')
  const [chequeNo, setChequeNo] = useState('')
  const [technician, setTechnician] = useState('')
  const [signDate, setSignDate] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState(0)
  const [billNo, setBillNo] = useState('')
  const [dateText, setDateText] = useState('')
  const [customer, setCustomer] = useState('')
  const [customerHits, setCustomerHits] = useState<any[]>([])
  const [phone, setPhone] = useState('')
  const [customerTax, setCustomerTax] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [plate, setPlate] = useState('')
  const [plateHits, setPlateHits] = useState<any[]>([])
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [brandOpen, setBrandOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [color, setColor] = useState('')
  const [mileage, setMileage] = useState('')
  const [items, setItems] = useState<Line[]>([blank(), blank(), blank(), blank(), blank()])
  const [partFocus, setPartFocus] = useState(-1)
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [savedId, setSavedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [printerText, setPrinterText] = useState('???????????????')
  const [printerOn, setPrinterOn] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      const supabase = createClient()
      const branchRes = await supabase.from('branches').select('*').order('name')
      const employeeRes = await supabase.from('employees').select('*').limit(300)
      const partRes = await supabase.from('parts_services').select('id, name, price, stock').order('name').limit(800)
      const number = await nextBillNo(supabase)
      if (!alive) return
      setBranches(branchRes.data || [])
      setEmployees(employeeRes.data || [])
      setParts(partRes.data || [])
      setBillNo(number)
      setDateText(thaiDateOnly())
      setSignDate(isoToday())
      try {
        const draft = JSON.parse(localStorage.getItem('receiveDraft') || 'null')
        if (draft) {
          setCustomer(draft.customer || '')
          setPhone(draft.phone || '')
          setPlate(draft.plate || '')
          setModel(draft.car || '')
          setMileage(draft.mileage || '')
          if (draft.note) setNote(draft.note)
        }
        const picked = JSON.parse(localStorage.getItem('selectedItems') || '[]')
        if (Array.isArray(picked) && picked.length) {
          const lines = picked.slice(0, 16).map((item: any) => ({
            name: String(item.name || ''),
            qty: Number(item.qty || 1),
            price: Number(item.price || 0),
          }))
          while (lines.length < 5) lines.push(blank())
          setItems(lines)
          localStorage.removeItem('selectedItems')
        }
      } catch {}
    }
    ru'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Line = { name: string; qty: number; price: number }

const SHOP_TAX = '3101701714063'
const PROMPTPAY_ID = '0994102559'
const PROMPTPAY_TEXT = '099-410-2559'

const BRANCH_BOOK = [
  { key: '???????', title: '????????? ??????????????', address: '????????????????? ????????? ???????????????? ?????????????', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '???????', title: '????????? ???????', address: '56/6 ??????? 5 ?????????????? ???????????? ????????? ????????????? 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '???????', title: '????????? ???????', address: '201/2 ??????? 5 ??????????????????? ??????????????? ????????? ????????????? 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: '?????', title: '????????? ?????', address: '63/20 ??????? 3 ???????????? ????????? ?????????? ????????????? 83000', phone: '099-4102559 , 084-3057559', email: 'ratsada_air@hotmail.com' },
]

const DOC_TYPES = [
  { id: 'receipt', title: '??????????????/Receipt' },
  { id: 'delivery', title: '????????/Delivery Bill' },
  { id: 'deposit', title: '??????????????/Receive Deposit' },
  { id: 'quotation', title: '??????????/Quotation' },
]

const PAY_TYPES = [
  { id: 'cash', label: '??????' },
  { id: 'transfer', label: '???' },
  { id: 'cheque', label: '????' },
  { id: 'credit', label: '?????????????' },
]

const BRANDS: Record<string, string[]> = {
  Toyota: ['Vios', 'Yaris', 'Yaris Ativ', 'Corolla Altis', 'Corolla Cross', 'Camry', 'Fortuner', 'Hilux Revo', 'Hilux Vigo', 'Commuter', 'Hiace', 'Innova', 'Alphard', 'Veloz', 'C-HR', 'Raize', 'Avanza'],
  Honda: ['City', 'Civic', 'Jazz', 'Accord', 'HR-V', 'CR-V', 'BR-V', 'Freed', 'Brio', 'Mobilio', 'Odyssey'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'BT-50'],
  Nissan: ['Almera', 'March', 'Note', 'Teana', 'Navara', 'Terra', 'X-Trail', 'Urvan'],
  Mitsubishi: ['Attrage', 'Mirage', 'Lancer', 'Pajero Sport', 'Triton', 'Xpander'],
  Isuzu: ['D-Max', 'MU-X', 'MU-7'],
  Ford: ['Ranger', 'Everest', 'Focus', 'Fiesta'],
  Chevrolet: ['Colorado', 'Trailblazer', 'Captiva', 'Cruze'],
  Suzuki: ['Swift', 'Ciaz', 'Ertiga', 'XL7', 'Carry'],
  MG: ['MG3', 'MG5', 'ZS', 'HS', 'Extender'],
  Hyundai: ['H-1', 'Staria', 'Tucson', 'Creta'],
  Kia: ['Carnival', 'Sportage', 'Seltos'],
  BMW: ['Series 3', 'Series 5', 'X1', 'X3', 'X5'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLC', 'Vito'],
  Lexus: ['NX', 'RX', 'ES', 'IS'],
  Subaru: ['XV', 'Forester', 'Outback'],
}

const COLORS = ['???', '??', '???', '????', '???', '???????', '??????', '???', '?????', '??????', '???', '???']

function blank(): Line {
  return { name: '', qty: 1, price: 0 }
}

function fit(value: string, min = 4) {
  return { width: `${Math.max(min, value.length + 1)}ch` }
}

function isoToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function thaiDateOnly(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = date.getFullYear() + 543
  return `${dd}/${mm}/${yy}`
}

function thaiFromIso(iso: string) {
  if (!iso || iso.length < 10) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${Number(year) + 543}`
}

function crc16(data: string) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function promptPay(id: string, amount: number) {
  const numbers = id.replace(/\D/g, '')
  const target = numbers.length >= 13 ? numbers : ('0000000000000' + numbers.replace(/^0/, '66')).slice(-13)
  const targetType = numbers.length >= 15 ? '03' : numbers.length >= 13 ? '02' : '01'
  const field = (tag: string, value: string) => tag + String(value.length).padStart(2, '0') + value
  const merchant = field('00', 'A000000677010111') + field(targetType, target)
  const amountText = amount > 0 ? amount.toFixed(2) : ''
  const body = [
    field('00', '01'),
    field('01', amountText ? '12' : '11'),
    field('29', merchant),
    field('58', 'TH'),
    field('53', '764'),
    amountText ? field('54', amountText) : '',
  ].join('')
  const data = body + '6304'
  return data + crc16(data)
}

async function nextBillNo(supabase: any) {
  const now = new Date()
  const prefix = `${String(now.getFullYear() + 543).slice(-2)}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-`
  const res = await supabase.from('bills').select('bill_no').ilike('bill_no', `${prefix}%`).limit(200)
  let max = 0
  for (const row of res.data || []) {
    const n = Number(String(row.bill_no || '').split('-').pop())
    if (Number.isFinite(n) && n > max) max = n
  }
  return prefix + String(max + 1).padStart(3, '0')
}

function bahtText(amount: number) {
  const digits = ['', '?????', '???', '???', '???', '???', '??', '????', '???', '????']
  const units = ['', '???', '????', '???', '?????', '???']
  const group = (num: number): string => {
    if (num >= 1000000) return group(Math.floor(num / 1000000)) + '????' + group(num % 1000000)
    const s = String(num)
    let out = ''
    for (let i = 0; i < s.length; i++) {
      const d = Number(s[i])
      const p = s.length - i - 1
      if (!d) continue
      if (p === 1 && d === 1) out += '???'
      else if (p === 1 && d === 2) out += '??????'
      else if (p === 0 && d === 1 && s.length > 1) out += '????'
      else out += digits[d] + units[p]
    }
    return out
  }
  const n = Math.round(Math.abs(Number(amount || 0)) * 100)
  const baht = Math.floor(n / 100)
  const satang = n % 100
  if (!baht && !satang) return '????????????'
  return `${baht ? group(baht) + '???' : ''}${satang ? group(satang) + '??????' : '????'}`
}

function readAge(data: any): number | null {
  if (typeof data === 'number') return data
  if (typeof data === 'string' && data !== '' && !Number.isNaN(Number(data))) return Number(data)
  if (Array.isArray(data)) return readAge(data[0])
  if (data && typeof data === 'object') {
    const value = data.age_seconds ?? data.age ?? data.seconds ?? data.printer_age
    if (value != null && !Number.isNaN(Number(value))) return Number(value)
  }
  return null
}

export default function ReceiptPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [docType, setDocType] = useState('receipt')
  const [customerType, setCustomerType] = useState('general')
  const [payType, setPayType] = useState('cash')
  const [chequeNo, setChequeNo] = useState('')
  const [technician, setTechnician] = useState('')
  const [signDate, setSignDate] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState(0)
  const [billNo, setBillNo] 
