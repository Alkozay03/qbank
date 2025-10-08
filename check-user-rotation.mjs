import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserRotation() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'u21103000@sharjah.ac.ae' },
      select: {
        email: true,
        rotation: true,
        rotationNumber: true,
        gradYear: true,
      },
    });

    console.warn('👤 User Profile:');
    console.warn('  Email:', user?.email);
    console.warn('  Current Rotation:', user?.rotation || 'NOT SET ❌');
    console.warn('  Rotation Number:', user?.rotationNumber || 'NOT SET ❌');
    console.warn('  Graduation Year:', user?.gradYear || 'NOT SET ❌');
    console.warn('');

    // Check if there are any active rotation periods
    const activePeriods = await prisma.rotationPeriod.findMany({
      where: { isActive: true },
      select: {
        id: true,
        academicYear: true,
        rotationNumber: true,
        rotationName: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });

    console.warn('📅 Active Rotation Periods:', activePeriods.length);
    if (activePeriods.length === 0) {
      console.warn('  NO ACTIVE ROTATION PERIODS ❌');
      console.warn('  → You need to create a rotation period in /year4/admin/rotation-schedule');
    } else {
      activePeriods.forEach((period, idx) => {
        console.warn(`  ${idx + 1}. ${period.academicYear} - ${period.rotationNumber} - ${period.rotationName}`);
        console.warn(`     Period: ${period.startDate.toLocaleDateString()} to ${period.endDate.toLocaleDateString()}`);
        
        // Check if user matches this period
        if (user?.rotation === period.rotationName && 
            user?.rotationNumber === period.rotationNumber && 
            user?.gradYear === period.academicYear) {
          console.warn('     ✅ MATCHES YOUR PROFILE - You can vote!');
        } else {
          console.warn('     ⚠️ Does not match your profile');
        }
      });
    }

    console.warn('');
    console.warn('🗳️ Voting Eligibility:');
    if (!user?.rotation || !user?.rotationNumber || !user?.gradYear) {
      console.warn('  ❌ CANNOT VOTE - Missing profile settings');
      console.warn('  → Go to your Profile Settings and set:');
      console.warn('     - Current Rotation (e.g., IM, Surgery, Pediatrics)');
      console.warn('     - Rotation Number (R1, R2, R3, R4)');
      console.warn('     - Graduation Year');
    } else if (activePeriods.length === 0) {
      console.warn('  ❌ CANNOT VOTE - No active rotation periods');
      console.warn('  → Admin needs to create a rotation period at /year4/admin/rotation-schedule');
    } else {
      const matchingPeriod = activePeriods.find(p => 
        p.rotationName === user.rotation &&
        p.rotationNumber === user.rotationNumber &&
        p.academicYear === user.gradYear
      );
      
      if (matchingPeriod) {
        console.warn('  ✅ CAN VOTE - All requirements met!');
      } else {
        console.warn('  ❌ CANNOT VOTE - No matching rotation period');
        console.warn('  → Your profile:', user.gradYear, user.rotationNumber, user.rotation);
        console.warn('  → Available periods:', activePeriods.map(p => `${p.academicYear} ${p.rotationNumber} ${p.rotationName}`).join(', '));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRotation();
