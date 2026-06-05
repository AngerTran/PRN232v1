using System;
using Npgsql;

namespace DbCheck
{
    class Program
    {
        static void Main(string[] args)
        {
            string connStr = "Host=aws-1-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.icoplbjqykxtpguxmcbf;Password=JbWQHvXhiePhwPjk;SSL Mode=Require;Trust Server Certificate=true";
            try
            {
                using var conn = new NpgsqlConnection(connStr);
                conn.Open();
                Console.WriteLine("Connection successful!");

                // Insert a dummy page into the user's chapter
                Guid pageId = Guid.NewGuid();
                Guid chapterId = new Guid("50c47263-f147-4272-83f5-300b82da8eba");
                
                // Check if a page already exists for this chapter to avoid unique constraint violations
                using (var checkCmd = new NpgsqlCommand("SELECT COUNT(*) FROM pages WHERE chapter_id = @cid AND page_number = 1", conn))
                {
                    checkCmd.Parameters.AddWithValue("cid", chapterId);
                    long count = (long)checkCmd.ExecuteScalar();
                    if (count > 0)
                    {
                        Console.WriteLine("Page 1 already exists for this chapter. Skipping insert.");
                        return;
                    }
                }

                using (var cmd = new NpgsqlCommand("INSERT INTO pages (id, chapter_id, page_number, image_url, status) VALUES (@id, @cid, @num, @url, 'draft'::page_status)", conn))
                {
                    cmd.Parameters.AddWithValue("id", pageId);
                    cmd.Parameters.AddWithValue("cid", chapterId);
                    cmd.Parameters.AddWithValue("num", 1);
                    cmd.Parameters.AddWithValue("url", "https://res.cloudinary.com/dgzb0rowq/image/upload/v1780554225/iywu4woumsoiylrsw50i.jpg");
                    cmd.ExecuteNonQuery();
                    Console.WriteLine($"Inserted dummy page successfully with ID: {pageId}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        }
    }
}
