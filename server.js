require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_healthcare_station_12345';

app.use(cors());
app.use(express.json());
const path = require('path');

// อนุญาตให้เซิร์ฟเวอร์อ่านไฟล์ HTML, CSS, JS ในโฟลเดอร์ปัจจุบันได้
app.use(express.static(__dirname)); 

// เมื่อมีคนเข้าหน้าเว็บแรก (/) ให้ส่งไฟล์ index.html ไปแสดงผล
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 🛡️ Middleware สำหรับตรวจสอบสิทธิ์ (JWT Token)
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'ไม่พบ Token การเข้าถึง' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
        req.user = user;
        next();
    });
};

const requireRole = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้' });
    }
    next();
};

// ==========================================
// 🔑 1. ระบบ Login (เข้าสู่ระบบ)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งานนี้' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.firstName }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ message: 'เข้าสู่ระบบสำเร็จ', token, role: user.role, userId: user.id , firstName: user.firstName, lastName: user.lastName});
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==========================================
// 🧍‍♂️ 2. ระบบลงทะเบียนผู้ป่วย (Patient Registration)
// ==========================================
// 2.1 ผู้ป่วยสมัครเอง (ต้องสแกน Barcode ทีหลัง)
app.post('/api/patient/register', async (req, res) => {
    // 🔴 เติมคำว่า gender เข้าไปตรงนี้ เพื่อรับค่าจากหน้าเว็บ
    const { username, password, firstName, lastName, dob, nationalId, disease, allergy, gender } = req.body;
    
    try {
        // (โค้ดด้านล่างปล่อยไว้เหมือนเดิมครับ)
        const hashedPassword = await bcrypt.hash(password, 10);
        // สร้าง Barcode จำลอง PT-XXXXXX
        const barcode = 'PT-' + Math.random().toString(36).substr(2, 6).toUpperCase(); 
        const age = new Date().getFullYear() - new Date(dob).getFullYear();

        const newPatient = await prisma.user.create({
            data: {
                username, password: hashedPassword, role: 'PATIENT',
                firstName, lastName, dob: new Date(dob), age, gender,
                nationalId, disease, allergy, barcode
            }
        });
        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ', barcode: newPatient.barcode });
    } catch (error) {
        res.status(400).json({ error: 'ข้อมูลซ้ำ (Username หรือ บัตรประชาชน) หรือข้อมูลไม่ครบ' });
    }
});

// 2.2 เจ้าหน้าที่คัดกรองสมัครให้ผู้ป่วย (Bypass Barcode 1 รอบ ทันที)
app.post('/api/officer/register-patient', authenticateToken, requireRole(['OFFICER', 'ADMIN']), async (req, res) => {
    const { username, password, firstName, lastName, dob, nationalId, disease, allergy, gender } = req.body;
    
    try {
        // --- 🔴 เพิ่มส่วนนี้: เช็คก่อนว่ามีคิวค้างอยู่ไหม ---
        const activeQueue = await prisma.screeningQueue.findFirst({
            where: { isCompleted: false }
        });
        
        if (activeQueue) {
            return res.status(400).json({ error: 'ไม่สามารถสมัครได้! มีผู้ป่วยคนอื่นกำลังรอตรวจอยู่ในคิว' });
        }
        // ------------------------------------------

        const hashedPassword = await bcrypt.hash(password, 10);
        const barcode = 'PT-' + Math.random().toString(36).substr(2, 6).toUpperCase(); 
        const age = new Date().getFullYear() - new Date(dob).getFullYear();

        // 1. สร้างผู้ป่วย
        const newPatient = await prisma.user.create({
            data: {
                username, password: hashedPassword, role: 'PATIENT',
                firstName, lastName, dob: new Date(dob), age, gender,
                nationalId, disease, allergy, barcode
            }
        });

        // 2. สร้างคิว Bypass
        await prisma.screeningQueue.create({
            data: {
                patientId: newPatient.id,
                bypassBarcode: true,
                isCompleted: false
            }
        });

        res.status(201).json({ message: 'ลงทะเบียนและ Bypass Barcode สำเร็จ ผู้ป่วยสามารถเข้าตู้ตรวจได้ทันที', barcode: newPatient.barcode });
    } catch (error) {
        res.status(400).json({ error: 'เกิดข้อผิดพลาดในการลงทะเบียน ข้อมูลอาจซ้ำ' });
    }
});

// ==========================================
// 👩‍⚕️ 3. ระบบค้นหาและข้อมูลสำหรับเจ้าหน้าที่ (Officer)
// ==========================================
// 3.1 ค้นหาผู้ป่วยด้วยบัตรประชาชน 13 หลักเท่านั้น (ห้ามค้นด้วยชื่อ)
app.get('/api/officer/search-patient', authenticateToken, requireRole(['OFFICER', 'ADMIN']), async (req, res) => {
    const { nationalId } = req.query;
    if (!nationalId || nationalId.length !== 13) {
        return res.status(400).json({ error: 'กรุณาระบุเลขบัตรประชาชน 13 หลักให้ถูกต้อง' });
    }

    try {
        const patient = await prisma.user.findUnique({
            where: { nationalId },
            select: { id: true, firstName: true, lastName: true, age: true, disease: true, allergy: true, barcode: true }
        });

        if (!patient) return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ป่วย' });
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3.2 ดูประวัติผู้ป่วย (History Record)
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        // ถ้าเป็นผู้ป่วย ดูได้แค่ของตัวเอง
        let whereCondition = {};
        if (req.user.role === 'PATIENT') {
            whereCondition = { patientId: req.user.id };
        }

        const records = await prisma.healthRecord.findMany({
            where: whereCondition,
            include: { patient: { select: { firstName: true, lastName: true, barcode: true } } },
            orderBy: { recordedAt: 'desc' },
            take: 50 // จำกัดการดึงข้อมูล 50 รายการล่าสุด
        });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==========================================
// 🤖 4. ลอจิกอุปกรณ์ IoT (ESP32 / บลูทูธ) และ Manual Mode
// ==========================================
// 4.1 ตู้ตรวจเช็คว่ามีคิว Bypass อยู่หรือไม่? (ESP32 ยิง API นี้เรื่อยๆ หรือตอนมีคนขึ้นตู้)
app.get('/api/iot/check-bypass', async (req, res) => {
    try {
        // หาคิวที่ bypass=true และยังไม่ตรวจ (isCompleted=false) ที่เก่าที่สุด
        const activeQueue = await prisma.screeningQueue.findFirst({
            // where: { bypassBarcode: true, isCompleted: false },
            where: { isCompleted: false }, // ค้นหาคิวที่ยังไม่สมบูรณ์ทั้งหมด
            orderBy: { createdAt: 'asc' },
            include: { patient: { select: { id: true, firstName: true, lastName: true } } }
        });

        if (activeQueue) {
            res.json({ status: 'ready_bypass', patientId: activeQueue.patient.id, name: activeQueue.patient.firstName });
        } else {
            res.json({ status: 'waiting_for_barcode' });
        }
    } catch (error) {
        res.status(500).json({ error: 'IoT Error' });
    }
});

// 4.2 ตู้ตรวจรับ Barcode จากเครื่องยิง (กรณีไม่มี Bypass)
app.post('/api/iot/scan-barcode', async (req, res) => {
    const { barcode } = req.body;
    try {
        const patient = await prisma.user.findUnique({ where: { barcode, role: 'PATIENT' } });
        if (!patient) return res.status(404).json({ error: 'ไม่พบ Barcode นี้ในระบบ' });

        // สร้างเซสชันเตรียมบันทึกข้อมูล
        await prisma.screeningQueue.create({
            data: { patientId: patient.id, bypassBarcode: false, isCompleted: false }
        });

        res.json({ status: 'ready', patientId: patient.id, name: patient.firstName });
    } catch (error) {
        res.status(500).json({ error: 'Scanner Error' });
    }
});

// 4.3 บันทึกผลตรวจสุขภาพลง Database
app.post('/api/iot/save-data', async (req, res) => {
    try {
        // 1. บันทึกข้อมูลลง History
        await prisma.healthRecord.create({ data: req.body });
        
        // 2. เคลียร์สถานะคิวให้เสร็จสิ้น (isCompleted = true)
        await prisma.screeningQueue.updateMany({ 
            where: { patientId: req.body.patientId, isCompleted: false }, 
            data: { isCompleted: true } 
        });

        // 🔴 3. เพิ่มบรรทัดนี้: ล้างค่า Sensor สดๆ บน Server ทันที เพื่อไม่ให้ค้างไปคนถัดไป
        liveSensorData = { temp: 0, weight: 0, height: 0, sys: 0, dia: 0, bpm: 0 };

        res.json({ message: 'Saved' });
    } catch (error) {
        console.error("Save Data Error:", error);
        res.status(500).json({ error: 'Failed to save health data' });
    }
});
// 4.4 ดึงข้อมูลผลตรวจล่าสุดของผู้ป่วย (เพื่อโชว์บน Live Dashboard)
app.get('/api/iot/latest-record', async (req, res) => {
    const { patientId } = req.query;
    try {
        const record = await prisma.healthRecord.findFirst({
            where: { patientId },
            orderBy: { recordedAt: 'desc' } // ดึงรายการใหม่ล่าสุด
        });
        res.json(record || {});
    } catch (error) {
        res.status(500).json({ error: 'Error fetching latest record' });
    }
});
// 4.5 ยกเลิกคิวผู้ป่วยที่ค้างอยู่
app.post('/api/iot/cancel-queue', async (req, res) => {
    const { patientId } = req.body;
    try {
        await prisma.screeningQueue.updateMany({
            where: { patientId, isCompleted: false },
            data: { isCompleted: true } // ปรับให้สถานะเป็นเสร็จสิ้นเพื่อเคลียร์คิวออก
        });
        res.json({ message: 'ยกเลิกคิวสำเร็จ' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel queue' });
    }
});
// ==========================================
// 📡 4.6 ระบบรับค่า Live Sensor & Serial Logs (Real-time)
// ==========================================
let liveSensorData = { temp: 0, weight: 0, height: 0, sys: 0, dia: 0, bpm: 0 };
let systemLogs = [];

// API สำหรับรับค่า Sensor สดๆ จาก ESP32
app.post('/api/iot/live-sensor', (req, res) => {
    const { temp, weight, height, sys, dia, bpm } = req.body;
    if (temp > 0) liveSensorData.temp = temp;
    if (weight > 0) liveSensorData.weight = weight;
    if (height > 0) liveSensorData.height = height;
    if (sys > 0) liveSensorData.sys = sys;
    if (dia > 0) liveSensorData.dia = dia;
    if (bpm > 0) liveSensorData.bpm = bpm;
    res.send('ok');
});

// API สำหรับหน้าเว็บดึงค่า Sensor ไปแสดง
app.get('/api/iot/live-sensor', (req, res) => {
    res.json(liveSensorData);
});

// API สำหรับเคลียร์ค่าเป็น 0 เมื่อจบ/ยกเลิกคิว
app.post('/api/iot/clear-live-sensor', (req, res) => {
    liveSensorData = { temp: 0, weight: 0, height: 0, sys: 0, dia: 0, bpm: 0 };
    res.send('ok');
});

// API สำหรับรับข้อความ Serial Monitor จาก ESP32
app.post('/api/iot/log', (req, res) => {
    const time = new Date().toLocaleTimeString('th-TH');
    systemLogs.push(`[${time}] ${req.body.message}`);
    // เก็บประวัติแค่ 50 บรรทัดล่าสุด เพื่อไม่ให้รก
    if (systemLogs.length > 50) systemLogs.shift();
    res.send('ok');
});

// API สำหรับหน้าเว็บดึง Serial Monitor ไปแสดง
app.get('/api/iot/logs', (req, res) => {
    res.json(systemLogs);
});
// ==========================================
// ⚙️ 5. ระบบผู้ดูแลระบบ (Admin)
// ==========================================
// 5.1 Admin สร้างบัญชีเจ้าหน้าที่คัดกรอง
app.post('/api/admin/create-officer', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
    // รับมาแค่ 4 ค่า (ไม่เอา officerId และ dob)
    const { username, password, firstName, lastName } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 🔴 สร้างรหัสประจำตัวเจ้าหน้าที่อัตโนมัติ (เช่น OFC-93847)
        const autoOfficerId = "OFC-" + Math.floor(10000 + Math.random() * 90000);

        const newOfficer = await prisma.user.create({
            data: {
                username, 
                password: hashedPassword, 
                role: 'OFFICER',
                firstName, 
                lastName, 
                officerId: autoOfficerId,
                // ใส่ค่า Dummy วันเกิดปัจจุบันลงไป เพื่อไม่ให้ Database Error
                dob: new Date(), 
                age: 0
            }
        });
        
        res.status(201).json({ 
            message: 'สร้างบัญชีเจ้าหน้าที่สำเร็จ', 
            officerId: newOfficer.officerId 
        });
    } catch (error) {
        res.status(400).json({ error: 'Username นี้ถูกใช้งานไปแล้ว หรือข้อมูลผิดพลาด' });
    }
});

// 5.2 Admin ค้นหาเจ้าหน้าที่ด้วย officerId หรือ ชื่อ-สกุล
app.get('/api/admin/search-officer', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
    const { query } = req.query; // รับค่า officerId หรือ ชื่อ
    try {
        const officers = await prisma.user.findMany({
            where: {
                role: 'OFFICER',
                OR: [
                    { officerId: { contains: query, mode: 'insensitive' } },
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: { id: true, officerId: true, firstName: true, lastName: true }
        });
        res.json(officers);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==========================================
// 5. ระบบจัดการผู้ใช้งาน (User Management สำหรับ OFFICER และ ADMIN)
// ==========================================

// 5.1 ดึงรายชื่อผู้ใช้งาน (OFFICER เห็นแค่ PATIENT / ADMIN เห็นทั้ง PATIENT และ OFFICER)
app.get('/api/users', authenticateToken, requireRole(['OFFICER', 'ADMIN']), async (req, res) => {
    const { search } = req.query; 
    let whereClause = {};
    
    // กำหนดสิทธิ์การมองเห็น
    if (req.user.role === 'OFFICER') {
        whereClause.role = 'PATIENT';
    } else if (req.user.role === 'ADMIN') {
        whereClause.role = { in: ['PATIENT', 'OFFICER'] };
    }

    // ถ้ามีการค้นหาด้วย เลขบัตร หรือ Username
    if (search) {
        whereClause.OR = [
            { nationalId: { contains: search } },
            { username: { contains: search } }
        ];
    }

    try {
        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, username: true, role: true, firstName: true, lastName: true, nationalId: true, disease: true, allergy: true },
            orderBy: { role: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// 5.2 แก้ไขข้อมูลผู้ใช้ (รับอัปเดตแค่ ชื่อ-นามสกุล)
app.put('/api/users/:id', authenticateToken, requireRole(['OFFICER', 'ADMIN']), async (req, res) => {
    const { id } = req.params; 
    // 🔴 รับจากหน้าเว็บมาแค่ firstName กับ lastName เท่านั้น
    const { firstName, lastName } = req.body;

    try {
        const targetUser = await prisma.user.findUnique({ where: { id: id } });
        if (!targetUser) return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' });

        // บล็อกไม่ให้ OFFICER แก้ไขข้อมูลของใครก็ตามที่ไม่ใช่ PATIENT
        if (req.user.role === 'OFFICER' && targetUser.role !== 'PATIENT') {
            return res.status(403).json({ error: 'คุณมีสิทธิ์แก้ไขได้เฉพาะข้อมูลของผู้ป่วย (PATIENT) เท่านั้น' });
        }

        // 🔴 สั่งอัปเดตเฉพาะชื่อและนามสกุล (ไม่ต้องไปยุ่งกับเลข ปชช, โรค, แพ้ยา)
        await prisma.user.update({
            where: { id: id }, 
            data: { firstName, lastName }
        });
        res.json({ message: 'อัปเดตข้อมูลสำเร็จ' });
    } catch (error) {
        console.error("Update User Error: ", error);
        res.status(500).json({ error: 'อัปเดตไม่สำเร็จ โปรดตรวจสอบข้อมูล' });
    }
});

// 5.3 ลบข้อมูลผู้ใช้ (เฉพาะ ADMIN)
app.delete('/api/users/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
    const { id } = req.params; // รับ id มาเป็น String ตรงๆ
    
    try {
        // ใช้ Transaction ลบเรียงตามลำดับ โดยส่ง id เป็น String ทั้งหมด
        await prisma.$transaction([
            prisma.screeningQueue.deleteMany({ where: { patientId: id } }),
            prisma.healthRecord.deleteMany({ where: { patientId: id } }),
            prisma.user.delete({ where: { id: id } })
        ]);

        res.json({ message: 'ลบข้อมูลสำเร็จ' });
    } catch (error) {
        console.error("Delete User Error: ", error);
        res.status(500).json({ error: 'ลบไม่สำเร็จ โปรดลองใหม่อีกครั้ง' });
    }
});

// 5.4 ดึงข้อมูลโปรไฟล์ผู้ป่วยและประวัติการตรวจทั้งหมด (สำหรับหน้า Dashboard)
app.get('/api/users/:id/records', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. ดึงข้อมูลส่วนตัว
        const user = await prisma.user.findUnique({
            where: { id: id },
            select: {
                id: true, firstName: true, lastName: true, nationalId: true, barcode: true,
                dob: true, gender: true, disease: true, allergy: true
            }
        });

        if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });

        // 2. ดึงประวัติการตรวจสุขภาพทั้งหมด เรียงจากใหม่ไปเก่า
        const records = await prisma.healthRecord.findMany({
            // 🔴 เปลี่ยนจาก { patientId: id } เป็นการเชื่อม Relation โดยตรงแบบนี้
            where: { patient: { id: id } }, 
            orderBy: { recordedAt: 'desc' }
        });

        res.json({ user, records });
    } catch (error) {
        console.error("Fetch Records Error: ", error);
        res.status(500).json({ error: 'ดึงข้อมูลประวัติล้มเหลว' });
    }
});
// ==========================================
// 🚀 เริ่มต้น Server
// ==========================================
app.listen(PORT, () => {
    console.log(`✅ Smart HealthCare API กำลังรันอยู่ที่ http://localhost:${PORT}`);
});