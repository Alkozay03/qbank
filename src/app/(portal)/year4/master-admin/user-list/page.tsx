export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export default async function UserList() {
  // Only allow access to MASTER_ADMIN with specific email
  const session = await auth();
  const email = session?.user?.email;
  
  if (!email) {
    redirect("/login");
  }

  // Verify that the user is a MASTER_ADMIN
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (!user || user.role !== "MASTER_ADMIN") {
    redirect("/year4");
  }

  // Temporarily allow any MASTER_ADMIN user for debugging
  // TODO: Re-enable email restriction after fixing role assignment
  
  // For now, just check if user has MASTER_ADMIN role
  // if (email === "u21103000@sharjah.ac.ae") {
  //   // Allow access - you are the authorized master admin
  // } else {
  //   // Deny access to anyone else
  //   redirect("/year4");
  // }

  // Fetch all users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      gradYear: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#2F6F8F]">User List</h1>
        <a 
          href="/year4/master-admin" 
          className="text-[#2F6F8F] hover:underline"
        >
          Back to Master Admin
        </a>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grad Year
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : "No name provided"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === "MASTER_ADMIN" 
                        ? "bg-[#A5CDE4] text-[#2F6F8F]" 
                        : user.role === "ADMIN" 
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.gradYear || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
