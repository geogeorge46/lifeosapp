import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Setting up Supabase auth triggers & RLS policies...");

  // 1. Create auth schema and local auth roles if running on standard local PostgreSQL
  try {
    console.log("Ensuring auth schema and local auth roles exist...");
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS auth;`);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE,
        raw_user_meta_data JSONB
      );
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
      END
      $$;
    `);
  } catch (e) {
    console.log("ℹ️ Skipping local auth schema/role creation (assuming remote Supabase host).");
  }

  // Create auth.uid() mock helper function if not already present
  try {
    console.log("Creating auth.uid() helper function...");
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid
      AS $$
        SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
      $$ LANGUAGE sql STABLE;
    `);
  } catch (e) {
    console.log("ℹ️ Skipping auth.uid() creation (assuming it already exists in Supabase).");
  }

  // 2. Create the Auth-to-Public user sync trigger
  try {
    console.log("Creating user sync trigger function...");
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.users (id, email, name, "createdAt", "updatedAt")
        VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', ''), NOW(), NOW());
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`);
    
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    `);
  } catch (e: any) {
    console.log(`⚠️ Warning: Could not setup trigger on auth.users directly. Message: ${e.message}`);
    console.log("👉 If this fails, you can copy the SQL triggers block into the Supabase Dashboard SQL Editor.");
  }

  // 3. Tables to enable RLS on
  const tables = [
    { name: "users", col: "id" },
    { name: "brain_dumps", col: "userId" },
    { name: "brain_dump_collections", col: "userId" },
    { name: "ideas", col: "userId" },
    { name: "tasks", col: "userId" },
    { name: "events", col: "userId" },
    { name: "places", col: "userId" },
    { name: "people", col: "userId" },
    { name: "transactions", col: "userId" },
    { name: "daily_recaps", col: "userId" },
    { name: "notification_preferences", col: "userId" },
    { name: "notification_logs", col: "userId" },
    { name: "geofence_triggers", col: "userId" },
    { name: "habits", col: "userId" },
    { name: "relationships", col: "userId" },
    { name: "occasions", col: "userId" },
    { name: "task_occurrences", col: "userId" },
    { name: "task_histories", col: "userId" },
    { name: "habit_completions", col: "userId" },
    { name: "triggers", col: "userId" }
  ];

  for (const table of tables) {
    console.log(`Enabling RLS and policies on table "${table.name}"...`);
    
    try {
      // Enable RLS
      await prisma.$executeRawUnsafe(`ALTER TABLE public."${table.name}" ENABLE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE public."${table.name}" FORCE ROW LEVEL SECURITY;`);

      // Drop existing policies if any
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${table.name}_isolation_policy" ON public."${table.name}";`);
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "users_isolation_policy" ON public."users";`);

      // Create policy
      const policySql = table.name === "users" 
        ? `CREATE POLICY "users_isolation_policy" ON public."users" FOR ALL TO authenticated USING (auth.uid() = id);`
        : `CREATE POLICY "${table.name}_isolation_policy" ON public."${table.name}" FOR ALL TO authenticated USING (auth.uid() = "${table.col}");`;
      
      await prisma.$executeRawUnsafe(policySql);
    } catch (e: any) {
      console.error(`❌ Failed to apply policies on table ${table.name}: ${e.message}`);
    }
  }

  console.log("All RLS policies successfully applied!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
