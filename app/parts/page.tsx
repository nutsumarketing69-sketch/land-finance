'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = { cat: string; name: string; price: number; stock: number; min: number; track: boolean }

const CATALOG: Row[] = [
  { cat: 'บริการ', name: 'ตรวจเช็คระบบแอร์', price: 250, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เติมน้ำยา R134a ค่าแรง', price: 350, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เติมน้ำยา R1234yf ค่าแรง', price: 600, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ทำสูญญากาศระบบ', price: 350, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เก็บน้ำยาเก่ากลับถัง', price: 200, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ตรวจรั่วด้วยน้ำยา UV', price: 250, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ล้างรังผึ้งร้อน', price: 450, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ล้างตู้แอร์ภายใน', price: 900, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ล้างแอร์ใหญ่ทั้งระบบ', price: 1800, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ฆ่าเชื้อและดับกลิ่นในตู้', price: 500, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ล้างท่อน้ำทิ้งแอร์', price: 300, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนไส้กรองแอร์ ค่าแรง', price: 150, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนคอมเพรสเซอร์ ค่าแรง', price: 1200, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนรังผึ้งร้อน ค่าแรง', price: 700, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนรังผึ้งเย็น ค่าแรง', price: 2800, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ค่าถอดคอนโซล', price: 1500, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนเอ็กซ์แปนชั่นวาล์ว ค่าแรง', price: 1500, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนไดเออร์ ค่าแรง', price: 450, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เชื่อมท่อน้ำยา ต่อจุด', price: 400, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เดินท่อใหม่ทั้งเส้น', price: 1200, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ซ่อมคลัตช์คอมเพรสเซอร์ ค่าแรง', price: 800, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ตั้งศูนย์มู่เล่ย์', price: 500, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนลูกปืนมู่เล่ย์ ค่าแรง', price: 450, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนสายพาน ค่าแรง', price: 250, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'แก้ไขระบบไฟแอร์', price: 600, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ติดตั้งแอร์ใหม่ทั้งชุด', price: 4500, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ย้ายตำแหน่งตู้แอร์', price: 2500, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ซ่อมรั่วรังผึ้ง', price: 800, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ล้างหม้อน้ำ', price: 500, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'เปลี่ยนน้ำยาหม้อน้ำ ค่าแรง', price: 300, stock: 0, min: 0, track: false },
  { cat: 'บริการ', name: 'ค่าเดินทางในเมือง', price: 300, stock: 0, min: 0, track: false },

  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา R134a 100 กรัม', price: 180, stock: 20, min: 5, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา R134a 200 กรัม', price: 320, stock: 10, min: 3, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา R134a 300 กรัม', price: 450, stock: 10, min: 3, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา R134a 500 กรัม', price: 700, stock: 6, min: 2, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา R134a กระป๋อง 350 กรัม', price: 480, stock: 12, min: 4, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา R1234yf 100 กรัม', price: 550, stock: 8, min: 2, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา R1234yf 200 กรัม', price: 1000, stock: 4, min: 1, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา R1234yf 300 กรัม', price: 1450, stock: 4, min: 1, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำมันคอม PAG 46 100 มล.', price: 220, stock: 10, min: 3, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำมันคอม PAG 100 100 มล.', price: 220, stock: 10, min: 3, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำมันคอม PAG 150 100 มล.', price: 250, stock: 6, min: 2, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำมันคอม POE 100 มล.', price: 320, stock: 6, min: 2, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำมันคอม Mineral 100 มล.', price: 200, stock: 4, min: 1, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยา UV หลอด', price: 180, stock: 10, min: 3, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'สารหยุดรั่วขนาดเล็ก', price: 390, stock: 6, min: 2, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยาล้างคอยล์ 1 ลิตร', price: 250, stock: 8, min: 2, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยาฆ่าเชื้อ 1 ขวด', price: 180, stock: 8, min: 2, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'สเปรย์ดับกลิ่นแอร์', price: 150, stock: 10, min: 3, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'โฟมล้างตู้แอร์', price: 220, stock: 8, min: 2, track: true },
  { cat: 'น้ำยาและน้ำมัน', name: 'น้ำยาหม้อน้ำ 1 ลิตร', price: 180, stock: 8, min: 2, track: true },

  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ 10S11C', price: 4200, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ 10S15C', price: 4500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ 10S17C', price: 4800, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ 10S20C', price: 5500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ DKV14', price: 5200, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ TV12C', price: 4200, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ TV14C', price: 4800, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ CR14', price: 5500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ HS15', price: 6500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ HS18', price: 7500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ 7H15', price: 8500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ DKS17D', price: 6800, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ CSE717', price: 7200, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ 6CA17', price: 5800, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ SCSA08', price: 6200, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ TRSE09', price: 7800, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ Panasonic H12A1', price: 5500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์ Sanden SD7H15', price: 9500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์รถเก๋งเล็ก ราคาพื้นฐาน', price: 4500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์รถกระบะ ราคาพื้นฐาน', price: 5500, stock: 1, min: 0, track: true },
  { cat: 'คอมเพรสเซอร์', name: 'คอมเพรสเซอร์รถตู้ ราคาพื้นฐาน', price: 7500, stock: 1, min: 0, track: true },

  { cat: 'คลัตช์และมู่เล่ย์', name: 'ชุดคลัตช์คอม 10S', price: 1800, stock: 2, min: 1, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'ชุดคลัตช์คอม TV', price: 1600, stock: 2, min: 1, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'ชุดคลัตช์คอม DKV', price: 1900, stock: 1, min: 0, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'หน้าคลัตช์', price: 900, stock: 2, min: 1, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'คอยล์คลัตช์', price: 1400, stock: 2, min: 1, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'มู่เล่ย์คอม', price: 1200, stock: 2, min: 1, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'ลูกปืนมู่เล่ย์ 35x55x20', price: 350, stock: 4, min: 2, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'ลูกปืนมู่เล่ย์ 40x62x24', price: 420, stock: 4, min: 2, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'ชิมอัดคลัตช์ ชุด', price: 120, stock: 5, min: 2, track: true },
  { cat: 'คลัตช์และมู่เล่ย์', name: 'ซีลเพลาคอม', price: 450, stock: 3, min: 1, track: true },

  { cat: 'รังผึ้ง', name: 'คอนเดนเซอร์รถเก๋งเล็ก', price: 1800, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'คอนเดนเซอร์รถเก๋งกลาง', price: 2200, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'คอนเดนเซอร์รถกระบะ', price: 2400, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'คอนเดนเซอร์รถตู้', price: 2800, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'อีวาพอเรเตอร์รถเก๋ง', price: 2500, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'อีวาพอเรเตอร์รถกระบะ', price: 2800, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'อีวาพอเรเตอร์รถตู้', price: 3500, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'รังผึ้งฮีตเตอร์', price: 1600, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'หม้อน้ำรถเก๋ง', price: 2200, stock: 1, min: 0, track: true },
  { cat: 'รังผึ้ง', name: 'หม้อน้ำรถกระบะ', price: 2600, stock: 1, min: 0, track: true },

  { cat: 'พัดลม', name: 'มอเตอร์พัดลมหน้ารถเก๋ง', price: 1200, stock: 2, min: 1, track: true },
  { cat: 'พัดลม', name: 'มอเตอร์พัดลมหน้ารถกระบะ', price: 1400, stock: 2, min: 1, track: true },
  { cat: 'พัดลม', name: 'มอเตอร์โบลเวอร์รถเก๋ง', price: 1400, stock: 2, min: 1, track: true },
  { cat: 'พัดลม', name: 'มอเตอร์โบลเวอร์รถกระบะ', price: 1500, stock: 2, min: 1, track: true },
  { cat: 'พัดลม', name: 'มอเตอร์โบลเวอร์รถตู้', price: 1800, stock: 1, min: 0, track: true },
  { cat: 'พัดลม', name: 'ใบพัดพัดลมหน้า', price: 350, stock: 3, min: 1, track: true },
  { cat: 'พัดลม', name: 'ใบโบลเวอร์', price: 450, stock: 2, min: 1, track: true },
  { cat: 'พัดลม', name: 'รีซีสเตอร์พัดลมหน้า', price: 450, stock: 3, min: 1, track: true },
  { cat: 'พัดลม', name: 'รีซีสเตอร์โบลเวอร์', price: 550, stock: 3, min: 1, track: true },
  { cat: 'พัดลม', name: 'โมดูลควบคุมพัดลม', price: 1800, stock: 1, min: 0, track: true },

  { cat: 'วาล์วและไดเออร์', name: 'เอ็กซ์แปนชั่นวาล์วรถเก๋ง', price: 850, stock: 3, min: 1, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'เอ็กซ์แปนชั่นวาล์วรถกระบะ', price: 950, stock: 2, min: 1, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'เอ็กซ์แปนชั่นวาล์วรถตู้', price: 1200, stock: 2, min: 1, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'ออริฟิสท่อ', price: 280, stock: 6, min: 2, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'วาล์วบริการคู่', price: 180, stock: 8, min: 2, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'ไดเออร์เล็ก', price: 450, stock: 4, min: 1, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'ไดเออร์กลาง', price: 550, stock: 4, min: 1, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'ไดเออร์ใหญ่', price: 750, stock: 2, min: 1, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'แอคคิวมูเลเตอร์', price: 650, stock: 2, min: 1, track: true },
  { cat: 'วาล์วและไดเออร์', name: 'ฝาจุกวาล์วบริการ', price: 40, stock: 20, min: 5, track: true },

  { cat: 'ท่อและข้อต่อ', name: 'ท่ออลูมิเนียม 3/8 เมตร', price: 250, stock: 6, min: 2, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ท่ออลูมิเนียม 1/2 เมตร', price: 280, stock: 6, min: 2, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ท่ออลูมิเนียม 5/8 เมตร', price: 320, stock: 4, min: 1, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ท่ออลูมิเนียม 3/4 เมตร', price: 380, stock: 3, min: 1, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'สายยางแรงดันสูง เมตร', price: 450, stock: 4, min: 1, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'สายยางแรงดันต่ำ เมตร', price: 380, stock: 4, min: 1, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ข้อต่ออลูมิเนียมตรง', price: 120, stock: 10, min: 3, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ข้องอ 90 องศา', price: 150, stock: 10, min: 3, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ข้อลด', price: 140, stock: 8, min: 2, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ฟิตติ้ง #6', price: 80, stock: 15, min: 5, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ฟิตติ้ง #8', price: 90, stock: 15, min: 5, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ฟิตติ้ง #10', price: 100, stock: 12, min: 4, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'ฟิตติ้ง #12', price: 120, stock: 10, min: 3, track: true },
  { cat: 'ท่อและข้อต่อ', name: 'น็อตหัวกลมวาล์ว', price: 60, stock: 15, min: 5, track: true },

  { cat: 'โอริงและซีล', name: 'ชุดโอริงกล่องใหญ่', price: 350, stock: 4, min: 1, track: true },
  { cat: 'โอริงและซีล', name: 'โอริงเขียว HNBR ชิ้น', price: 15, stock: 50, min: 20, track: true },
  { cat: 'โอริงและซีล', name: 'โอริงดำ NBR ชิ้น', price: 10, stock: 50, min: 20, track: true },
  { cat: 'โอริงและซีล', name: 'ปะเก็นคอมเพรสเซอร์', price: 80, stock: 8, min: 2, track: true },
  { cat: 'โอริงและซีล', name: 'ปะเก็นไดเออร์', price: 40, stock: 8, min: 2, track: true },
  { cat: 'โอริงและซีล', name: 'เทปพันท่อ', price: 50, stock: 10, min: 3, track: true },

  { cat: 'ไส้กรอง', name: 'ไส้กรองแอร์กระดาษรถเก๋ง', price: 250, stock: 8, min: 3, track: true },
  { cat: 'ไส้กรอง', name: 'ไส้กรองแอร์คาร์บอนรถเก๋ง', price: 450, stock: 6, min: 2, track: true },
  { cat: 'ไส้กรอง', name: 'ไส้กรองแอร์รถกระบะ', price: 280, stock: 6, min: 2, track: true },
  { cat: 'ไส้กรอง', name: 'ไส้กรองแอร์รถตู้', price: 350, stock: 4, min: 1, track: true },
  { cat: 'ไส้กรอง', name: 'ไส้กรองแอร์ HEPA', price: 650, stock: 3, min: 1, track: true },

  { cat: 'ไฟฟ้าแอร์', name: 'รีเลย์แอร์ 4 ขา', price: 120, stock: 10, min: 3, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'รีเลย์แอร์ 5 ขา', price: 150, stock: 8, min: 3, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'ฟิวส์ 10A', price: 20, stock: 20, min: 10, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'ฟิวส์ 15A', price: 20, stock: 20, min: 10, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'ฟิวส์ 20A', price: 25, stock: 20, min: 10, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'ฟิวส์ 25A', price: 25, stock: 15, min: 5, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'ฟิวส์ 30A', price: 30, stock: 15, min: 5, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'สวิตช์ความดันคู่', price: 450, stock: 3, min: 1, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'สวิตช์ความดันเดี่ยว', price: 350, stock: 3, min: 1, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'เซ็นเซอร์อุณหภูมิตู้', price: 450, stock: 3, min: 1, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'เซ็นเซอร์แดด', price: 650, stock: 2, min: 1, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'สวิตช์แอร์ในห้องโดยสาร', price: 550, stock: 2, min: 1, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'แผงควบคุมแอร์รถเก๋ง', price: 2500, stock: 1, min: 0, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'แผงควบคุมแอร์รถกระบะ', price: 2200, stock: 1, min: 0, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'เทอร์โมสตัทแอร์', price: 650, stock: 2, min: 1, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'สายไฟชุดแอร์', price: 350, stock: 3, min: 1, track: true },
  { cat: 'ไฟฟ้าแอร์', name: 'ปลั๊กคอมเพรสเซอร์', price: 180, stock: 4, min: 1, track: true },

  { cat: 'อะไหล่ร่วม', name: 'สายพานหน้าเครื่อง', price: 350, stock: 4, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'สายพานคอมเพรสเซอร์', price: 400, stock: 4, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'ลูกรอกปรับตั้ง', price: 450, stock: 2, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'ลูกรอกไอเดิล', price: 380, stock: 2, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'ขายึดคอมเพรสเซอร์', price: 350, stock: 2, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'น็อตคอมชุด', price: 80, stock: 8, min: 2, track: true },
  { cat: 'อะไหล่ร่วม', name: 'ลูกยางแท่นเครื่อง', price: 250, stock: 4, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'ฝาหม้อน้ำ', price: 180, stock: 4, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'เทอร์โมสตัทหม้อน้ำ', price: 350, stock: 3, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'ท่อน้ำหม้อน้ำบน', price: 280, stock: 2, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'ท่อน้ำหม้อน้ำล่าง', price: 280, stock: 2, min: 1, track: true },
  { cat: 'อะไหล่ร่วม', name: 'กระป๋องพักน้ำ', price: 350, stock: 2, min: 1, track: true },
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

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('parts_services').select('*').order('name')
    setParts(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const catOf = (p: any) => p.category || CATALOG.find((r) => r.name === p.name)?.cat || 'ทั่วไป'

  const shown = useMemo(() => {
    return parts.filter((p) => {
      const c = catOf(p)
      const text = `${p.name} ${c}`.toLowerCase()
      if (cat !== 'ทั้งหมด' && c !== cat) return false
      if (q && !text.includes(q.toLowerCase())) return false
      return true
    })
  }, [parts, q, cat])

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

    const shapes = [
      (r: Row) => ({ name: r.name, price: r.price, stock: r.stock, min_stock: r.min, category: r.cat }),
      (r: Row) => ({ name: r.name, price: r.price, stock: r.stock, min_stock: r.min }),
      (r: Row) => ({ name: r.name, price: r.price, stock: r.stock }),
      (r: Row) => ({ name: r.name, price: r.price }),
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
    let { error } = await supabase.from('parts_services').insert({
      name: name.trim(),
      price: Number(price),
      stock: Number(stock) || 0,
      min_stock: 0,
      category,
    })
    if (error) {
      const retry = await supabase.from('parts_services').insert({
        name: name.trim(),
        price: Number(price),
        stock: Number(stock) || 0,
      })
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
      part_id: SERVICE_NAMES.has(p.name) || catOf(p) === 'บริการ' ? null : p.id,
    }))
    localStorage.setItem('selectedItems', JSON.stringify(items))
    window.location.href = '/receipt'
  }

  const chosenCount = parts.filter((p) => selected[p.id]).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">อะไหล่ / บริการ</h1>
          <p className="text-sm text-gray-400">
            รายการมาตรฐาน {CATALOG.length} รายการ ในระบบตอนนี้ {parts.length} รายการ ราคาเป็นราคาพื้นฐาน แก้ได้ทันที
          </p>
        </div>
        <button onClick={importStandard} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'กำลังนำเข้า...' : 'นำเข้าอะไหล่มาตรฐาน'}
        </button>
      </div>

      {msg && <p className="mb-3 text-sm text-amber-300">{msg}</p>}

      <div className="grid md:grid-cols-5 gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อรายการใหม่" className="md:col-span-2 border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="หมวด" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ราคา" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <div className="flex gap-2">
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="สต็อก" className="w-24 border border-gray-600 bg-gray-800 rounded p-2 text-white" />
          <button onClick={addOne} className="bg-blue-600 text-white px-3 rounded">เพิ่ม</button>
        </div>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ค้นหา เช่น คอม , R134a , ล้างตู้" className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white mb-3" />

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
            <input type="checkbox" checked={!!selected[p.id]} onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))} />
            <div className="flex-1 min-w-[220px]">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">{catOf(p)}{SERVICE_NAMES.has(p.name) || catOf(p) === 'บริการ' ? ' · ไม่ตัดสต็อก' : ''}</div>
            </div>
            <label className="text-xs text-gray-400">
              ราคา
              <input
                type="number"
                defaultValue={p.price}
                onBlur={(e) => saveField(p.id, 'price', Number(e.target.value))}
                className="block w-28 mt-1 border border-gray-600 bg-gray-800 rounded p-1 text-white"
              />
            </label>
            <label className="text-xs text-gray-400">
              สต็อก
              <input
                type="number"
                defaultValue={p.stock ?? 0}
                onBlur={(e) => saveField(p.id, 'stock', Number(e.target.value))}
                className="block w-20 mt-1 border border-gray-600 bg-gray-800 rounded p-1 text-white"
              />
            </label>
            <label className="text-xs text-gray-400">
              จำนวน
              <input
                type="number"
                min={1}
                value={qty[p.id] || 1}
                onChange={(e) => setQty((m) => ({ ...m, [p.id]: Number(e.target.value) || 1 }))}
                className="block w-16 mt-1 border border-gray-600 bg-gray-800 rounded p-1 text-white"
              />
            </label>
            <button onClick={() => removePart(p.id, p.name)} className="text-red-400 text-sm">ลบ</button>
          </div>
        ))}
        {shown.length === 0 && <p className="text-gray-400">ยังไม่มีรายการ กดนำเข้าอะไหล่มาตรฐานได้เลย</p>}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <button onClick={sendToBill} className="bg-green-600 text-white px-5 py-3 rounded shadow-lg">
          นำไปออกบิล ({chosenCount})
        </button>
      </div>
    </div>
  )
}
