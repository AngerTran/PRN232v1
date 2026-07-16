using Npgsql;

var connStr =
    "Host=aws-1-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.icoplbjqykxtpguxmcbf;Password=JbWQHvXhiePhwPjk;SSL Mode=Require;Trust Server Certificate=true";

await using var conn = new NpgsqlConnection(connStr);
await conn.OpenAsync();

await using (var check = new NpgsqlCommand(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'publishing_schedules' AND column_name = 'chapter_id'",
    conn))
{
    if (await check.ExecuteScalarAsync() is not null)
    {
        Console.WriteLine("chapter_id already exists");
        return;
    }
}

await using var cmd = new NpgsqlCommand("""
    ALTER TABLE publishing_schedules ADD COLUMN chapter_id uuid NULL;
    CREATE UNIQUE INDEX publishing_schedules_chapter_id_key ON publishing_schedules (chapter_id) WHERE chapter_id IS NOT NULL;
    ALTER TABLE publishing_schedules
      ADD CONSTRAINT publishing_schedules_chapter_id_fkey
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL;
    """, conn);
await cmd.ExecuteNonQueryAsync();
Console.WriteLine("Migration applied: publishing_schedules.chapter_id");
