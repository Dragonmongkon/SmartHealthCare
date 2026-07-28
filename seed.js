const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // เรียกใช้ bcrypt เพื่อเข้ารหัสรหัสผ่าน
const prisma = new PrismaClient();

async function main() {
  // 1. เข้ารหัสรหัสผ่านก่อนบันทึก (สำคัญมาก)
  const adminPassword = bcrypt.hashSync('admin12345', 10);
  const testPassword = bcrypt.hashSync('test12345', 10);

  // 2. สร้าง Admin
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { 
        password: adminPassword // ถ้ามีบัญชีอยู่แล้ว ให้อัปเดตเป็นรหัสผ่านที่ Hash แล้ว
    },
    create: {
      username: 'admin',
      password: adminPassword, // ใช้รหัสผ่านที่ Hash แล้ว
      role: 'ADMIN',
      firstName: 'ผู้ดูแลระบบ',
      lastName: 'ส่วนกลาง',
      officerId: 'ADM-001',
      dob: new Date('1985-01-01'),
      age: 41,
    },
  });

  // 3. สร้าง เจ้าหน้าที่คัดกรอง
  await prisma.user.upsert({
    where: { username: 'Test' },
    update: { 
        password: testPassword // ถ้ามีบัญชีอยู่แล้ว ให้อัปเดตเป็นรหัสผ่านที่ Hash แล้ว
    },
    create: {
      username: 'Test',
      password: testPassword, // ใช้รหัสผ่านที่ Hash แล้ว
      role: 'OFFICER',
      firstName: 'สมศรี',
      lastName: 'ใจดี',
      officerId: 'OFF-001',
      dob: new Date('1990-05-15'),
      age: 36,
    },
  });

  console.log('✅ สร้างบัญชีและอัปเดตรหัสผ่าน (Hashed) เรียบร้อยแล้ว!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // role: OFFICER
  // user : Test
  // pass : test12345

    // role: ADMIN
  // user : admin
  // pass : admin12345