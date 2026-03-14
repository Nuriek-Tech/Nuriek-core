import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearMockData() {
  console.log('Clearing mock data...')
  
  // Delete all relational data
  await prisma.attendance.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.orgTask.deleteMany();
  // using any cast for missing types in generated client if they exist
  try { await (prisma as any).internPerformance.deleteMany(); } catch (e) {}
  try { await (prisma as any).document.deleteMany(); } catch (e) {}
  
  // Delete all users except the super admin
  await prisma.user.deleteMany({
    where: {
      email: {
        not: "admin@nuriek.com"
      }
    }
  });

  console.log('Mock data cleared. Only admin@nuriek.com remains.');
}

clearMockData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
