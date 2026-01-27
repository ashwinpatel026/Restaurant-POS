import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { checkLocationPermission } from "@/lib/auth/accessControl";
import TablesClient from "./TablesClient";
import type { Table } from "./TablesClient";

export default async function TablesPage() {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.role) {
    redirect("/login");
  }

  // Check permission to view tables
  const hasPermission = await checkLocationPermission(
    session.user.role,
    "tables.view"
  );

  if (!hasPermission) {
    redirect("/dashboard/access-denied");
  }

  // Fetch tables directly from database (Server Component)
  // @ts-ignore - generated client exposes `table` for model `Table`
  const tables = await prisma.table.findMany({
    orderBy: { createdDate: "desc" },
  });

  // Sort by createdDate descending (most recent first)
  const sortedTables: Table[] = tables.map((table) => ({
    ...table,
    tableId: table.tableId.toString(),
    createdDate: table.createdDate?.toISOString() || new Date().toISOString(),
  }));

  // Pass initial data to Client Component
  return <TablesClient initialTables={sortedTables} />;
}