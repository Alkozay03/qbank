// Check current user account
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'u21103000@sharjah.ac.ae'; // Your email
  
  const user = await prisma.user.findUnique({
    where: { email },
  });
  
  console.log('Your account:');
  console.log(JSON.stringify(user, null, 2));
  
  // Check approval status
  if (user) {
    console.log('\n✅ Account exists');
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
    console.log(`🎓 Grad Year: ${user.gradYear || 'Not set'}`);
    console.log(`🔑 Role: ${user.role}`);
    console.log(`✔️ Approval: ${user.approvalStatus}`);
    
    if (user.approvalStatus !== 'APPROVED') {
      console.log('\n⚠️ Your account is not APPROVED yet!');
      console.log('This is why you might not see full data.');
    }
  } else {
    console.log('❌ Account not found!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
