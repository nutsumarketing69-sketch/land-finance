'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = { cat: string; name: string; price: number; stock: number; min: number; track: boolean }

function baht(n: number) {
  return Math.round(n / 10) * 10
}
function labor(cat: string, name: string, price: number): Row {
  return { cat, name, price, stock: 0, min: 0, track: false }
}
function part(cat: string, name: string, price: number, stock = 1, min = 0): Row {
  return { cat, name, price, stock, min, track: true }
}

const G134 = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1800, 2000]
const GYF = [100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500]

const CATALOG: Row[] = [
  ...G134.map((g): Row => ({ cat: 'เติมน้ำยา R134a', name: `เติมน้ำยา R134a ${g} กรัม`, price: baht(g * 1.7 + 280), stock: 0, min: 0, track: false })),
  ...G134.map((g): Row => ({ cat: 'น้ำยา R134a', name: `น้ำยา R134a ${g} กรัม`, price: baht(g * 1.6), stock: g <= 500 ? 8 : 3, min: 1, track: true })),
  ...GYF.map((g): Row => ({ cat: 'เติมน้ำยา R1234yf', name: `เติมน้ำยา R1234yf ${g} กรัม`, price: baht(g * 5.5 + 400), stock: 0, min: 0, track: false })),
  ...GYF.map((g): Row => ({ cat: 'น้ำยา R1234yf', name: `น้ำยา R1234yf ${g} กรัม`, price: baht(g * 5.2), stock: g <= 300 ? 4 : 2, min: 1, track: true })),

  labor('บริการตรวจและค่าแรง', 'ตรวจเช็คระบบแอร์', 250),
  labor('บริการตรวจและค่าแรง', 'ตรวจเช็คระบบแอร์นอกสถานที่', 450),
  labor('บริการตรวจและค่าแรง', 'ทำสูญญากาศระบบ', 350),
  labor('บริการตรวจและค่าแรง', 'เก็บน้ำยาเก่ากลับถัง', 200),
  labor('บริการตรวจและค่าแรง', 'ตรวจรั่วด้วยน้ำยา UV', 250),
  labor('บริการตรวจและค่าแรง', 'ตรวจรั่วด้วยไนโตรเจน', 400),
  labor('บริการตรวจและค่าแรง', 'เติมน้ำยา R134a ค่าแรงอย่างเดียว', 350),
  labor('บริการตรวจและค่าแรง', 'เติมน้ำยา R1234yf ค่าแรงอย่างเดียว', 600),
  labor('บริการตรวจและค่าแรง', 'เชื่อมท่อน้ำยา 1 จุด', 400),
  labor('บริการตรวจและค่าแรง', 'เชื่อมท่อน้ำยา 2 จุด', 700),
  labor('บริการตรวจและค่าแรง', 'เชื่อมท่อน้ำยา 3 จุด', 1000),
  labor('บริการตรวจและค่าแรง', 'เดินท่อใหม่ทั้งเส้น เก๋ง', 1200),
  labor('บริการตรวจและค่าแรง', 'เดินท่อใหม่ทั้งเส้น กระบะ', 1500),
  labor('บริการตรวจและค่าแรง', 'เดินท่อใหม่ทั้งเส้น รถตู้', 1800),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนคอมเพรสเซอร์ ค่าแรง เก๋ง', 1200),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนคอมเพรสเซอร์ ค่าแรง กระบะ', 1500),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนคอมเพรสเซอร์ ค่าแรง รถตู้', 1800),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนคอมเพรสเซอร์ ค่าแรง รถยุโรป', 2500),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนรังผึ้งร้อน ค่าแรง เก๋ง', 700),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนรังผึ้งร้อน ค่าแรง กระบะ', 900),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนรังผึ้งร้อน ค่าแรง รถตู้', 1200),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนรังผึ้งเย็น ค่าแรง เก๋ง', 2800),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนรังผึ้งเย็น ค่าแรง กระบะ', 3200),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนรังผึ้งเย็น ค่าแรง รถตู้', 3800),
  labor('บริการตรวจและค่าแรง', 'ค่าถอดคอนโซล เก๋ง', 1500),
  labor('บริการตรวจและค่าแรง', 'ค่าถอดคอนโซล รถตู้', 2200),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนเอ็กซ์แปนชั่นวาล์ว ค่าแรง', 1500),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนไดเออร์ ค่าแรง', 450),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนไส้กรองแอร์ ค่าแรง', 150),
  labor('บริการตรวจและค่าแรง', 'ซ่อมคลัตช์คอมเพรสเซอร์ ค่าแรง', 800),
  labor('บริการตรวจและค่าแรง', 'ตั้งศูนย์มู่เล่ย์', 500),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนลูกปืนมู่เล่ย์ ค่าแรง', 450),
  labor('บริการตรวจและค่าแรง', 'เปลี่ยนสายพาน ค่าแรง', 250),
  labor('บริการตรวจและค่าแรง', 'แก้ไขระบบไฟแอร์', 600),
  labor('บริการตรวจและค่าแรง', 'ไล่ลมระบบหล่อเย็น', 300),
  labor('บริการตรวจและค่าแรง', 'ติดตั้งแอร์ใหม่ทั้งชุด เก๋ง', 4500),
  labor('บริการตรวจและค่าแรง', 'ติดตั้งแอร์ใหม่ทั้งชุด กระบะ', 5500),
  labor('บริการตรวจและค่าแรง', 'ติดตั้งแอร์ใหม่ทั้งชุด รถตู้', 7500),
  labor('บริการตรวจและค่าแรง', 'ย้ายตำแหน่งตู้แอร์', 2500),
  labor('บริการตรวจและค่าแรง', 'ซ่อมรั่วรังผึ้ง', 800),
  labor('บริการตรวจและค่าแรง', 'ค่าเดินทางในเมือง', 300),
  labor('บริการตรวจและค่าแรง', 'ค่าเดินทางต่างอำเภอ', 600),

  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างรังผึ้งร้อน เก๋ง', 450),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างรังผึ้งร้อน กระบะ', 550),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างตู้แอร์ภายใน เก๋ง', 900),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างตู้แอร์ภายใน กระบะ', 1100),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างตู้แอร์ภายใน รถตู้', 1500),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างตู้แอร์ภายใน รถยุโรป', 1800),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างแอร์ใหญ่ทั้งระบบ เก๋ง', 1800),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างแอร์ใหญ่ทั้งระบบ กระบะ', 2200),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างแอร์ใหญ่ทั้งระบบ รถตู้', 2800),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ฆ่าเชื้อและดับกลิ่นในตู้', 500),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างท่อน้ำทิ้งแอร์', 300),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ฉีดโฟมฆ่าเชื้อ', 350),
  labor('ล้างแอร์และฆ่าเชื้อ', 'ล้างหม้อน้ำ', 500),
  labor('ล้างแอร์และฆ่าเชื้อ', 'เปลี่ยนน้ำยาหม้อน้ำ ค่าแรง', 300),

  part('น้ำมันคอมและเคมี', 'น้ำมันคอม PAG 46 100 มล.', 220, 10, 3),
  part('น้ำมันคอมและเคมี', 'น้ำมันคอม PAG 100 100 มล.', 220, 10, 3),
  part('น้ำมันคอมและเคมี', 'น้ำมันคอม PAG 150 100 มล.', 250, 6, 2),
  part('น้ำมันคอมและเคมี', 'น้ำมันคอม POE 100 มล.', 320, 6, 2),
  part('น้ำมันคอมและเคมี', 'น้ำมันคอม Mineral 100 มล.', 200, 4, 1),
  part('น้ำมันคอมและเคมี', 'น้ำมันคอม PAG 46 250 มล.', 480, 4, 1),
  part('น้ำมันคอมและเคมี', 'น้ำมันคอม PAG 100 250 มล.', 480, 4, 1),
  part('น้ำมันคอมและเคมี', 'น้ำยา UV หลอด', 180, 10, 3),
  part('น้ำมันคอมและเคมี', 'สารหยุดรั่วขนาดเล็ก', 390, 6, 2),
  part('น้ำมันคอมและเคมี', 'น้ำยาล้างคอยล์ 1 ลิตร', 250, 8, 2),
  part('น้ำมันคอมและเคมี', 'น้ำยาฆ่าเชื้อ 1 ขวด', 180, 8, 2),
  part('น้ำมันคอมและเคมี', 'สเปรย์ดับกลิ่นแอร์', 150, 10, 3),
  part('น้ำมันคอมและเคมี', 'โฟมล้างตู้แอร์', 220, 8, 2),
  part('น้ำมันคอมและเคมี', 'น้ำยาหม้อน้ำ 1 ลิตร', 180, 8, 2),
  part('น้ำมันคอมและเคมี', 'น้ำยาหม้อน้ำ 4 ลิตร', 620, 4, 1),
  part('น้ำมันคอมและเคมี', 'น้ำยา R134a กระป๋อง 350 กรัม', 520, 12, 4),
  part('น้ำมันคอมและเคมี', 'น้ำยา R1234yf กระป๋อง 200 กรัม', 1450, 4, 1),

  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 10S11C', 4200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 10S13C', 4400),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 10S15C', 4500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 10S17C', 4800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 10S20C', 5500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 10PA15', 5200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 10PA17', 5600),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 10PA20', 6200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ DKV10', 4800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ DKV14', 5200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ TV10', 4000),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ TV12C', 4200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ TV14C', 4800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ CR14', 5500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ HS13', 6200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ HS15', 6500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ HS18', 7500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 7H13', 7800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 7H15', 8500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ DKS15D', 6400),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ DKS17D', 6800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ CSE613', 6600),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ CSE717', 7200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 6CA17', 5800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ 6SBU16', 6000),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ SCSA06', 5800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ SCSA08', 6200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ TRSA09', 7000),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ TRSE07', 7200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ TRSE09', 7800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ Panasonic H12A0', 5200),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ Panasonic H12A1', 5500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ Sanden SD7H13', 8800),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ Sanden SD7H15', 9500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ Sanden SD7V16', 10500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์ไฟฟ้า Hybrid ราคาพื้นฐาน', 18500),
  labor('คอมเพรสเซอร์', 'เปลี่ยนคอมเพรสเซอร์ไฟฟ้า Hybrid ค่าแรง', 3500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์รถเก๋งเล็ก ราคาพื้นฐาน', 4500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์รถกระบะ ราคาพื้นฐาน', 5500),
  part('คอมเพรสเซอร์', 'คอมเพรสเซอร์รถตู้ ราคาพื้นฐาน', 7500),

  part('คลัตช์และมู่เล่ย์', 'ชุดคลัตช์คอม 10S', 1800, 2, 1),
  part('คลัตช์และมู่เล่ย์', 'ชุดคลัตช์คอม TV', 1600, 2, 1),
  part('คลัตช์และมู่เล่ย์', 'ชุดคลัตช์คอม DKV', 1900, 1, 0),
  part('คลัตช์และมู่เล่ย์', 'ชุดคลัตช์คอม 10PA', 2100, 1, 0),
  part('คลัตช์และมู่เล่ย์', 'หน้าคลัตช์', 900, 2, 1),
  part('คลัตช์และมู่เล่ย์', 'คอยล์คลัตช์', 1400, 2, 1),
  part('คลัตช์และมู่เล่ย์', 'มู่เล่ย์คอม', 1200, 2, 1),
  part('คลัตช์และมู่เล่ย์', 'ลูกปืนมู่เล่ย์ 30x52x20', 280, 4, 2),
  part('คลัตช์และมู่เล่ย์', 'ลูกปืนมู่เล่ย์ 35x52x20', 320, 4, 2),
  part('คลัตช์และมู่เล่ย์', 'ลูกปืนมู่เล่ย์ 35x55x20', 350, 4, 2),
  part('คลัตช์และมู่เล่ย์', 'ลูกปืนมู่เล่ย์ 40x62x24', 420, 4, 2),
  part('คลัตช์และมู่เล่ย์', 'ชิมอัดคลัตช์ ชุด', 120, 5, 2),
  part('คลัตช์และมู่เล่ย์', 'ซีลเพลาคอม', 450, 3, 1),

  part('รังผึ้งและหม้อน้ำ', 'คอนเดนเซอร์รถเก๋งเล็ก', 1800),
  part('รังผึ้งและหม้อน้ำ', 'คอนเดนเซอร์รถเก๋งกลาง', 2200),
  part('รังผึ้งและหม้อน้ำ', 'คอนเดนเซอร์รถเก๋งใหญ่', 2600),
  part('รังผึ้งและหม้อน้ำ', 'คอนเดนเซอร์รถกระบะ', 2400),
  part('รังผึ้งและหม้อน้ำ', 'คอนเดนเซอร์รถตู้', 2800),
  part('รังผึ้งและหม้อน้ำ', 'คอนเดนเซอร์รถยุโรป', 4500),
  part('รังผึ้งและหม้อน้ำ', 'อีวาพอเรเตอร์รถเก๋งเล็ก', 2200),
  part('รังผึ้งและหม้อน้ำ', 'อีวาพอเรเตอร์รถเก๋ง', 2500),
  part('รังผึ้งและหม้อน้ำ', 'อีวาพอเรเตอร์รถกระบะ', 2800),
  part('รังผึ้งและหม้อน้ำ', 'อีวาพอเรเตอร์รถตู้', 3500),
  part('รังผึ้งและหม้อน้ำ', 'อีวาพอเรเตอร์รถยุโรป', 4800),
  part('รังผึ้งและหม้อน้ำ', 'รังผึ้งฮีตเตอร์ เก๋ง', 1600),
  part('รังผึ้งและหม้อน้ำ', 'รังผึ้งฮีตเตอร์ กระบะ', 1900),
  part('รังผึ้งและหม้อน้ำ', 'หม้อน้ำรถเก๋ง', 2200),
  part('รังผึ้งและหม้อน้ำ', 'หม้อน้ำรถกระบะ', 2600),
  part('รังผึ้งและหม้อน้ำ', 'หม้อน้ำรถตู้', 3200),
  part('รังผึ้งและหม้อน้ำ', 'อินเตอร์คูลเลอร์ ราคาพื้นฐาน', 3500),

  part('พัดลม', 'มอเตอร์พัดลมหน้ารถเก๋ง', 1200, 2, 1),
  part('พัดลม', 'มอเตอร์พัดลมหน้ารถกระบะ', 1400, 2, 1),
  part('พัดลม', 'มอเตอร์พัดลมหน้ารถตู้', 1800, 1, 0),
  part('พัดลม', 'มอเตอร์พัดลมคู่ ราคาพื้นฐาน', 2400, 1, 0),
  part('พัดลม', 'มอเตอร์โบลเวอร์รถเก๋ง', 1400, 2, 1),
  part('พัดลม', 'มอเตอร์โบลเวอร์รถกระบะ', 1500, 2, 1),
  part('พัดลม', 'มอเตอร์โบลเวอร์รถตู้', 1800, 1, 0),
  part('พัดลม', 'ใบพัดพัดลมหน้า', 350, 3, 1),
  part('พัดลม', 'ใบโบลเวอร์', 450, 2, 1),
  part('พัดลม', 'รีซีสเตอร์พัดลมหน้า', 450, 3, 1),
  part('พัดลม', 'รีซีสเตอร์โบลเวอร์', 550, 3, 1),
  part('พัดลม', 'โมดูลควบคุมพัดลม', 1800, 1, 0),

  part('วาล์วและไดเออร์', 'เอ็กซ์แปนชั่นวาล์วรถเก๋ง', 850, 3, 1),
  part('วาล์วและไดเออร์', 'เอ็กซ์แปนชั่นวาล์วรถกระบะ', 950, 2, 1),
  part('วาล์วและไดเออร์', 'เอ็กซ์แปนชั่นวาล์วรถตู้', 1200, 2, 1),
  part('วาล์วและไดเออร์', 'เอ็กซ์แปนชั่นวาล์วรถยุโรป', 1800, 1, 0),
  part('วาล์วและไดเออร์', 'บล็อกวาล์ว', 650, 2, 1),
  part('วาล์วและไดเออร์', 'ออริฟิสท่อ', 280, 6, 2),
  part('วาล์วและไดเออร์', 'วาล์วบริการคู่', 180, 8, 2),
  part('วาล์วและไดเออร์', 'ไดเออร์เล็ก', 450, 4, 1),
  part('วาล์วและไดเออร์', 'ไดเออร์กลาง', 550, 4, 1),
  part('วาล์วและไดเออร์', 'ไดเออร์ใหญ่', 750, 2, 1),
  part('วาล์วและไดเออร์', 'แอคคิวมูเลเตอร์', 650, 2, 1),
  part('วาล์วและไดเออร์', 'ฝาจุกวาล์วบริการ', 40, 20, 5),

  part('ท่อ ข้อต่อ และโอริง', 'ท่ออลูมิเนียม 5/16 เมตร', 220, 4, 1),
  part('ท่อ ข้อต่อ และโอริง', 'ท่ออลูมิเนียม 3/8 เมตร', 250, 6, 2),
  part('ท่อ ข้อต่อ และโอริง', 'ท่ออลูมิเนียม 1/2 เมตร', 280, 6, 2),
  part('ท่อ ข้อต่อ และโอริง', 'ท่ออลูมิเนียม 5/8 เมตร', 320, 4, 1),
  part('ท่อ ข้อต่อ และโอริง', 'ท่ออลูมิเนียม 3/4 เมตร', 380, 3, 1),
  part('ท่อ ข้อต่อ และโอริง', 'สายยางแรงดันสูง เมตร', 450, 4, 1),
  part('ท่อ ข้อต่อ และโอริง', 'สายยางแรงดันต่ำ เมตร', 380, 4, 1),
  part('ท่อ ข้อต่อ และโอริง', 'ข้อต่อตรง #6', 80, 15, 5),
  part('ท่อ ข้อต่อ และโอริง', 'ข้อต่อตรง #8', 90, 15, 5),
  part('ท่อ ข้อต่อ และโอริง', 'ข้อต่อตรง #10', 100, 12, 4),
  part('ท่อ ข้อต่อ และโอริง', 'ข้อต่อตรง #12', 120, 10, 3),
  part('ท่อ ข้อต่อ และโอริง', 'ข้องอ 90 #6', 120, 10, 3),
  part('ท่อ ข้อต่อ และโอริง', 'ข้องอ 90 #8', 140, 10, 3),
  part('ท่อ ข้อต่อ และโอริง', 'ข้องอ 90 #10', 160, 8, 2),
  part('ท่อ ข้อต่อ และโอริง', 'ข้องอ 90 #12', 180, 8, 2),
  part('ท่อ ข้อต่อ และโอริง', 'ข้องอ 45 #8', 140, 8, 2),
  part('ท่อ ข้อต่อ และโอริง', 'ข้องอ 45 #10', 160, 8, 2),
  part('ท่อ ข้อต่อ และโอริง', 'ข้อลด #10-#8', 140, 8, 2),
  part('ท่อ ข้อต่อ และโอริง', 'ข้อลด #12-#10', 160, 8, 2),
  part('ท่อ ข้อต่อ และโอริง', 'น็อตหัวกลมวาล์ว', 60, 15, 5),
  part('ท่อ ข้อต่อ และโอริง', 'ชุดโอริงกล่องใหญ่', 350, 4, 1),
  part('ท่อ ข้อต่อ และโอริง', 'โอริงเขียว HNBR #6', 15, 50, 20),
  part('ท่อ ข้อต่อ และโอริง', 'โอริงเขียว HNBR #8', 15, 50, 20),
  part('ท่อ ข้อต่อ และโอริง', 'โอริงเขียว HNBR #10', 20, 40, 15),
  part('ท่อ ข้อต่อ และโอริง', 'โอริงเขียว HNBR #12', 20, 40, 15),
  part('ท่อ ข้อต่อ และโอริง', 'ปะเก็นคอมเพรสเซอร์', 80, 8, 2),
  part('ท่อ ข้อต่อ และโอริง', 'ปะเก็นไดเออร์', 40, 8, 2),
  part('ท่อ ข้อต่อ และโอริง', 'เทปพันท่อ', 50, 10, 3),

  part('ไส้กรองแอร์', 'ไส้กรองแอร์กระดาษรถเก๋ง', 250, 8, 3),
  part('ไส้กรองแอร์', 'ไส้กรองแอร์คาร์บอนรถเก๋ง', 450, 6, 2),
  part('ไส้กรองแอร์', 'ไส้กรองแอร์รถกระบะ', 280, 6, 2),
  part('ไส้กรองแอร์', 'ไส้กรองแอร์รถตู้', 350, 4, 1),
  part('ไส้กรองแอร์', 'ไส้กรองแอร์ HEPA', 650, 3, 1),
  part('ไส้กรองแอร์', 'ไส้กรองแอร์รถยุโรป', 890, 2, 1),

  part('ไฟฟ้าแอร์', 'รีเลย์แอร์ 4 ขา', 120, 10, 3),
  part('ไฟฟ้าแอร์', 'รีเลย์แอร์ 5 ขา', 150, 8, 3),
  part('ไฟฟ้าแอร์', 'ฟิวส์ 10A', 20, 20, 10),
  part('ไฟฟ้าแอร์', 'ฟิวส์ 15A', 20, 20, 10),
  part('ไฟฟ้าแอร์', 'ฟิวส์ 20A', 25, 20, 10),
  part('ไฟฟ้าแอร์', 'ฟิวส์ 25A', 25, 15, 5),
  part('ไฟฟ้าแอร์', 'ฟิวส์ 30A', 30, 15, 5),
  part('ไฟฟ้าแอร์', 'สวิตช์ความดันคู่', 450, 3, 1),
  part('ไฟฟ้าแอร์', 'สวิตช์ความดันเดี่ยว', 350, 3, 1),
  part('ไฟฟ้าแอร์', 'เซ็นเซอร์อุณหภูมิตู้', 450, 3, 1),
  part('ไฟฟ้าแอร์', 'เซ็นเซอร์แดด', 650, 2, 1),
  part('ไฟฟ้าแอร์', 'สวิตช์แอร์ในห้องโดยสาร', 550, 2, 1),
  part('ไฟฟ้าแอร์', 'แผงควบคุมแอร์รถเก๋ง', 2500),
  part('ไฟฟ้าแอร์', 'แผงควบคุมแอร์รถกระบะ', 2200),
  part('ไฟฟ้าแอร์', 'แผงควบคุมแอร์รถตู้', 3200),
  part('ไฟฟ้าแอร์', 'แผงควบคุมแอร์อัตโนมัติ', 4500),
  part('ไฟฟ้าแอร์', 'เทอร์โมสตัทแอร์', 650, 2, 1),
  part('ไฟฟ้าแอร์', 'สายไฟชุดแอร์', 350, 3, 1),
  part('ไฟฟ้าแอร์', 'ปลั๊กคอมเพรสเซอร์', 180, 4, 1),
  part('ไฟฟ้าแอร์', 'เพรสเชอร์สวิตช์ 3 ขา', 520, 2, 1),

  part('ระบายความร้อนและสายพาน', 'สายพานหน้าเครื่อง เก๋ง', 350, 4, 1),
  part('ระบายความร้อนและสายพาน', 'สายพานหน้าเครื่อง กระบะ', 450, 3, 1),
  part('ระบายความร้อนและสายพาน', 'สายพานคอมเพรสเซอร์', 400, 4, 1),
  part('ระบายความร้อนและสายพาน', 'ลูกรอกปรับตั้ง', 450, 2, 1),
  part('ระบายความร้อนและสายพาน', 'ลูกรอกไอเดิล', 380, 2, 1),
  part('ระบายความร้อนและสายพาน', 'ขายึดคอมเพรสเซอร์', 350, 2, 1),
  part('ระบายความร้อนและสายพาน', 'น็อตคอมชุด', 80, 8, 2),
  part('ระบายความร้อนและสายพาน', 'ลูกยางแท่นเครื่อง', 250, 4, 1),
  part('ระบายความร้อนและสายพาน', 'ฝาหม้อน้ำ', 180, 4, 1),
  part('ระบายความร้อนและสายพาน', 'เทอร์โมสตัทหม้อน้ำ', 350, 3, 1),
  part('ระบายความร้อนและสายพาน', 'ท่อน้ำหม้อน้ำบน', 280, 2, 1),
  part('ระบายความร้อนและสายพาน', 'ท่อน้ำหม้อน้ำล่าง', 280, 2, 1),
  part('ระบายความร้อนและสายพาน', 'กระป๋องพักน้ำ', 350, 2, 1),
  part('ระบายความร้อนและสายพาน', 'ฝาหม้อพักน้ำ', 120, 3, 1),
  part('ระบายความร้อนและสายพาน', 'วาล์วน้ำ', 450, 2, 1),

  labor('บริการทั่วไปหน้าร้าน', 'ถ่ายน้ำมันเครื่องกึ่งสังเคราะห์ + กรอง เก๋ง', 890),
  labor('บริการทั่วไปหน้าร้าน', 'ถ่ายน้ำมันเครื่องสังเคราะห์ + กรอง เก๋ง', 1290),
  labor('บริการทั่วไปหน้าร้าน', 'ถ่ายน้ำมันเครื่องกึ่งสังเคราะห์ + กรอง กระบะ', 1190),
  labor('บริการทั่วไปหน้าร้าน', 'ถ่ายน้ำมันเครื่องสังเคราะห์ + กรอง กระบะ', 1690),
  labor('บริการทั่วไปหน้าร้าน', 'เปลี่ยนไส้กรองอากาศ ค่าแรง', 100),
  labor('บริการทั่วไปหน้าร้าน', 'เปลี่ยนผ้าเบรกหน้า ค่าแรง', 350),
  labor('บริการทั่วไปหน้าร้าน', 'เปลี่ยนผ้าเบรกหลัง ค่าแรง', 350),
  labor('บริการทั่วไปหน้าร้าน', 'เปลี่ยนแบตเตอรี่ ค่าแรง', 150),
  labor('บริการทั่วไปหน้าร้าน', 'เติมลมยาง 4 ล้อ', 40),
  labor('บริการทั่วไปหน้าร้าน', 'ถ่วงล้อ 1 วง', 150),
  labor('บริการทั่วไปหน้าร้าน', 'ตั้งศูนย์ล้อ', 500),
  labor('บริการทั่วไปหน้าร้าน', 'ล้างรถภายนอก', 200),
  labor('บริการทั่วไปหน้าร้าน', 'ดูดฝุ่นในห้องโดยสาร', 150),
  labor('บริการทั่วไปหน้าร้าน', 'ตรวจเช็คระยะ', 300),

  part('ของเหลวและไส้กรองเครื่อง', 'น้ำมันเครื่องกึ่งสังเคราะห์ 1 ลิตร', 180, 12, 4),
  part('ของเหลวและไส้กรองเครื่อง', 'น้ำมันเครื่องสังเคราะห์ 1 ลิตร', 280, 12, 4),
  part('ของเหลวและไส้กรองเครื่อง', 'น้ำมันเครื่องดีเซล 1 ลิตร', 220, 8, 2),
  part('ของเหลวและไส้กรองเครื่อง', 'ไส้กรองน้ำมันเครื่อง เก๋ง', 150, 8, 2),
  part('ของเหลวและไส้กรองเครื่อง', 'ไส้กรองน้ำมันเครื่อง กระบะ', 180, 6, 2),
  part('ของเหลวและไส้กรองเครื่อง', 'ไส้กรองอากาศ เก๋ง', 250, 4, 1),
  part('ของเหลวและไส้กรองเครื่อง', 'ไส้กรองอากาศ กระบะ', 320, 4, 1),
  part('ของเหลวและไส้กรองเครื่อง', 'ไส้กรองโซล่า', 350, 3, 1),
  part('ของเหลวและไส้กรองเครื่อง', 'น้ำมันเกียร์ 1 ลิตร', 220, 4, 1),
  part('ของเหลวและไส้กรองเครื่อง', 'น้ำมันเฟืองท้าย 1 ลิตร', 200, 3, 1),
  part('ของเหลวและไส้กรองเครื่อง', 'น้ำมันเบรก DOT4 1 ขวด', 180, 4, 1),
  part('ของเหลวและไส้กรองเครื่อง', 'น้ำมันพวงมาลัย 1 ลิตร', 180, 3, 1),
  part('ของเหลวและไส้กรองเครื่อง', 'น้ำกลั่น 1 ลิตร', 25, 20, 6),
  part('ของเหลวและไส้กรองเครื่อง', 'จาระบี 1 กระป๋อง', 80, 4, 1),

  part('เบรก', 'ผ้าเบรกหน้า เก๋ง', 890, 2, 1),
  part('เบรก', 'ผ้าเบรกหลัง เก๋ง', 790, 2, 1),
  part('เบรก', 'ผ้าเบรกหน้า กระบะ', 1100, 2, 1),
  part('เบรก', 'ผ้าเบรกหลัง กระบะ', 950, 2, 1),
  part('เบรก', 'จานเบรกหน้า 1 ข้าง', 1200, 2, 0),
  part('เบรก', 'กระบอกเบรกหลัง', 650, 2, 0),
  part('เบรก', 'สายเบรก', 350, 2, 1),

  part('แบตเตอรี่และไฟฟ้า', 'แบตเตอรี่แห้ง 40Ah', 2200, 1, 0),
  part('แบตเตอรี่และไฟฟ้า', 'แบตเตอรี่แห้ง 55Ah', 2800, 1, 0),
  part('แบตเตอรี่และไฟฟ้า', 'แบตเตอรี่แห้ง 70Ah', 3500, 1, 0),
  part('แบตเตอรี่และไฟฟ้า', 'แบตเตอรี่แห้ง 90Ah', 4500, 1, 0),
  part('แบตเตอรี่และไฟฟ้า', 'แบตเตอรี่แห้ง 110Ah', 5500, 1, 0),
  part('แบตเตอรี่และไฟฟ้า', 'ขั้วแบตคู่', 150, 4, 1),
  part('แบตเตอรี่และไฟฟ้า', 'หลอดไฟหน้า H4', 180, 4, 1),
  part('แบตเตอรี่และไฟฟ้า', 'หลอดไฟเลี้ยว', 40, 8, 2),
  part('แบตเตอรี่และไฟฟ้า', 'ใบปัดน้ำฝนคู่', 250, 4, 1),
  part('แบตเตอรี่และไฟฟ้า', 'หัวเทียน 1 หัว', 180, 8, 4),
  part('แบตเตอรี่และไฟฟ้า', 'หัวเทียนอิริเดียม 1 หัว', 350, 4, 2),
]

const SERVICE_NAMES = new Set(CATALOG.filter((r) => !r.track).map((r) => r.name))
const CATS = ['ทั้งหมด', ...Array.from(new Set(CATALOG.map((r) => r.cat)))]

export default function PartsPage() {
  const [parts, setParts] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('ทั้งหมด')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [qty, setQty] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [category, setCategory] = useState('ทั่วไป')
  const [itemType, setItemType] = useState('อะไหล่')

  const load = async () => {
    const supabase = createClient()
    const all: any[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('parts_services').select('*').order('name').range(from, from + 999)
      if (error || !data?.length) break
      all.push(...data)
      if (data.length < 1000) break
    }
    setParts(all)
  }

  useEffect(() => {
    load()
  }, [])

  const catOf = (p: any) => p.category || CATALOG.find((r) => r.name === p.name)?.cat || 'ทั่วไป'
  const isService = (p: any) => SERVICE_NAMES.has(p.name) || catOf(p).includes('บริการ') || catOf(p).includes('ล้าง') || catOf(p).includes('เติมน้ำยา') || p.type === 'บริการ' || p.type === 'service'

  const matched = useMemo(() => {
    return parts.filter((p) => {
      const c = catOf(p)
      const text = `${p.name} ${c}`.toLowerCase()
      if (cat !== 'ทั้งหมด' && c !== cat) return false
      if (q && !text.includes(q.toLowerCase())) return false
      return true
    })
  }, [parts, q, cat])
  const browsing = !q.trim() && cat === 'ทั้งหมด'
  const shown = browsing ? matched.slice(0, 40) : matched.slice(0, 200)

  const importStandard = async () => {
    setLoading(true)
    setMsg('กำลังนำเข้ารายการมาตรฐาน...')
    const supabase = createClient()
    const have = new Set(parts.map((p) => p.name))
    const missing = CATALOG.filter((r) => !have.has(r.name))
    if (missing.length === 0) {
      setMsg('มีรายการมาตรฐานครบแล้ว ไม่ได้ทับราคาเดิม')
      setLoading(false)
      return
    }

    const known = Array.from(new Set(parts.map((p) => p.type).filter(Boolean))) as string[]
    const partType = known.find((t) => /part|อะไหล่|สินค้า/i.test(String(t))) || known[0] || 'อะไหล่'
    const serviceType = known.find((t) => /service|บริการ|labor|ค่าแรง/i.test(String(t))) || 'บริการ'
    const typeOf = (r: Row, mode: 'split' | 'part') => (mode === 'part' ? partType : r.track ? partType : serviceType)

    const shapes = [
      (r: Row) => ({ name: r.name, price: r.price, stock: r.stock, min_stock: r.min, category: r.cat, type: typeOf(r, 'split') }),
      (r: Row) => ({ name: r.name, price: r.price, stock: r.stock, min_stock: r.min, category: r.cat, type: typeOf(r, 'part') }),
      (r: Row) => ({ name: r.name, price: r.price, stock: r.stock, min_stock: r.min, type: typeOf(r, 'part') }),
      (r: Row) => ({ name: r.name, price: r.price, stock: r.stock, type: typeOf(r, 'part') }),
    ]

    let shape = 0
    let probeError = ''
    for (let i = 0; i < shapes.length; i++) {
      const { error } = await supabase.from('parts_services').insert(shapes[i](missing[0]))
      if (!error) {
        shape = i
        probeError = ''
        break
      }
      probeError = error.message
    }

    if (probeError) {
      setMsg('นำเข้าไม่สำเร็จ: ' + probeError)
      setLoading(false)
      return
    }

    for (let i = 1; i < missing.length; i += 40) {
      const chunk = missing.slice(i, i + 40).map(shapes[shape])
      const { error } = await supabase.from('parts_services').insert(chunk)
      if (error) {
        setMsg('นำเข้าได้บางส่วน: ' + error.message)
        await load()
        setLoading(false)
        return
      }
    }

    await load()
    setMsg(`นำเข้าเพิ่ม ${missing.length} รายการแล้ว ราคาเดิมไม่ถูกทับ`)
    setLoading(false)
  }

  const addOne = async () => {
    if (!name.trim() || !price) {
      setMsg('ใส่ชื่อและราคา')
      return
    }
    const supabase = createClient()
    const row = { name: name.trim(), price: Number(price), stock: Number(stock) || 0, min_stock: 0, category, type: itemType }
    let { error } = await supabase.from('parts_services').insert(row)
    if (error) {
      const retry = await supabase.from('parts_services').insert({ name: row.name, price: row.price, stock: row.stock, type: itemType })
      error = retry.error
    }
    if (error) {
      setMsg('เพิ่มไม่สำเร็จ: ' + error.message)
      return
    }
    setName('')
    setPrice('')
    setStock('0')
    setMsg('เพิ่มรายการแล้ว')
    load()
  }

  const saveField = async (id: string, field: string, value: number) => {
    const supabase = createClient()
    await supabase.from('parts_services').update({ [field]: value }).eq('id', id)
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const removePart = async (id: string, partName: string) => {
    if (!confirm(`ลบ ${partName} ?`)) return
    const supabase = createClient()
    await supabase.from('parts_services').delete().eq('id', id)
    setParts((prev) => prev.filter((p) => p.id !== id))
  }

  const sendToBill = () => {
    const chosen = parts.filter((p) => selected[p.id])
    if (chosen.length === 0) {
      setMsg('ยังไม่ได้เลือกรายการ')
      return
    }
    const items = chosen.map((p) => ({
      name: p.name,
      price: Number(p.price) || 0,
      qty: qty[p.id] || 1,
      part_id: isService(p) ? null : p.id,
    }))
    localStorage.setItem('selectedItems', JSON.stringify(items))
    window.location.href = '/receipt'
  }

  const chosenCount = parts.filter((p) => selected[p.id]).length

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-28">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">อะไหล่ / บริการ</h1>
          <p className="text-sm text-gray-400">
            รายการมาตรฐาน {CATALOG.length} รายการ ในระบบตอนนี้ {parts.length} รายการ
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ชุด “เติมน้ำยา … กรัม” รวมค่าแรงแล้ว รายการ “น้ำยา … กรัม” เป็นค่าน้ำยาอย่างเดียว อย่าเลือกทั้งสองอย่างในบิลเดียวกัน
          </p>
        </div>
        <button onClick={importStandard} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'กำลังนำเข้า...' : 'นำเข้าอะไหล่มาตรฐาน'}
        </button>
      </div>

      {msg && <p className="mb-3 text-sm text-amber-300">{msg}</p>}

      <div className="grid md:grid-cols-6 gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อรายการใหม่" className="md:col-span-2 border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="หมวด" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="border border-gray-600 bg-gray-800 rounded p-2 text-white">
          <option value="อะไหล่">อะไหล่</option>
          <option value="บริการ">บริการ</option>
        </select>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ราคา" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <div className="flex gap-2">
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="สต็อก" className="w-24 border border-gray-600 bg-gray-800 rounded p-2 text-white" />
          <button onClick={addOne} className="bg-blue-600 text-white px-3 rounded">เพิ่ม</button>
        </div>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ตัวเดียวก็ขึ้น เช่น ก หรือ 1" className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white text-lg mb-3" />
      {browsing && <p className="text-sm text-gray-400 mb-3">แสดง 40 รายการแรก พิมพ์ชื่อเช่น ก เพื่อดูทุกรายการที่มีคำนั้น</p>}
      {!browsing && matched.length > shown.length && <p className="text-sm text-amber-300 mb-3">แสดง {shown.length} จาก {matched.length} พิมพ์เพิ่มอีกตัว</p>}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`shrink-0 px-3 py-1 rounded-full text-sm border ${cat === c ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {shown.map((p) => (
          <div key={p.id} className="border border-gray-700 rounded-lg px-3 py-2 bg-gray-900 flex flex-wrap items-center gap-3">
            <input type="checkbox" checked={!!selected[p.id]} onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))} className="w-6 h-6" />
            <div className="flex-1 min-w-0 basis-full sm:basis-auto">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">{catOf(p)} · {p.type || '-'}{isService(p) ? ' · ไม่ตัดสต็อก' : ''}</div>
            </div>
            <label className="text-xs text-gray-400">
              ราคา
              <input type="number" defaultValue={p.price} onBlur={(e) => saveField(p.id, 'price', Number(e.target.value))} className="block w-28 mt-1 border border-gray-600 bg-gray-800 rounded p-1 text-white" />
            </label>
            <label className="text-xs text-gray-400">
              สต็อก
              <input type="number" defaultValue={p.stock ?? 0} onBlur={(e) => saveField(p.id, 'stock', Number(e.target.value))} className="block w-20 mt-1 border border-gray-600 bg-gray-800 rounded p-1 text-white" />
            </label>
            <label className="text-xs text-gray-400">
              จำนวน
              <input type="number" min={1} value={qty[p.id] || 1} onChange={(e) => setQty((m) => ({ ...m, [p.id]: Number(e.target.value) || 1 }))} className="block w-16 mt-1 border border-gray-600 bg-gray-800 rounded p-1 text-white" />
            </label>
            <button onClick={() => removePart(p.id, p.name)} className="text-red-400 text-sm">ลบ</button>
          </div>
        ))}
        {shown.length === 0 && <p className="text-gray-400">ยังไม่มีรายการในหมวดนี้</p>}
      </div>

      <div className="sticky bottom-16 mt-6">
        <button onClick={sendToBill} className="w-full sm:w-auto bg-green-600 text-white px-5 py-4 rounded shadow-lg text-lg">นำไปออกบิล ({chosenCount})</button>
      </div>
    </div>
  )
}
