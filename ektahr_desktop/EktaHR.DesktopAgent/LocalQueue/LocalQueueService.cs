using System.Data;
using Microsoft.Data.Sqlite;

namespace EktaHR.DesktopAgent.LocalQueue;

public class LocalQueueService : IDisposable
{
    private readonly string _dbPath;
    private const int MaxRetry = 10;

    public LocalQueueService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var dir = Path.Combine(appData, "EktaHR", "Monitoring");
        Directory.CreateDirectory(dir);
        _dbPath = Path.Combine(dir, "queue.db");
        InitializeDb();
    }

    private void InitializeDb()
    {
        using var conn = new SqliteConnection($"Data Source={_dbPath}");
        conn.Open();
        var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS Queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                encryptedPayload TEXT NOT NULL,
                encryptedKey TEXT NOT NULL,
                metadata TEXT NOT NULL,
                retryCount INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_status ON Queue(status);
        ";
        cmd.ExecuteNonQuery();
    }

    public void Enqueue(string encryptedPayload, string encryptedKey, string metadata)
    {
        using var conn = new SqliteConnection($"Data Source={_dbPath}");
        conn.Open();
        var cmd = conn.CreateCommand();
        cmd.CommandText = "INSERT INTO Queue (encryptedPayload, encryptedKey, metadata, status) VALUES ($p, $k, $m, 'pending')";
        cmd.Parameters.AddWithValue("$p", encryptedPayload);
        cmd.Parameters.AddWithValue("$k", encryptedKey);
        cmd.Parameters.AddWithValue("$m", metadata);
        cmd.ExecuteNonQuery();
    }

    public QueueItem? Dequeue()
    {
        using var conn = new SqliteConnection($"Data Source={_dbPath}");
        conn.Open();
        var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, encryptedPayload, encryptedKey, metadata, retryCount FROM Queue WHERE status = 'pending' AND retryCount < $max ORDER BY id LIMIT 1";
        cmd.Parameters.AddWithValue("$max", MaxRetry);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;

        return new QueueItem
        {
            Id = r.GetInt64(0),
            EncryptedPayload = r.GetString(1),
            EncryptedKey = r.GetString(2),
            Metadata = r.GetString(3),
            RetryCount = r.GetInt32(4)
        };
    }

    public void MarkSuccess(long id)
    {
        using var conn = new SqliteConnection($"Data Source={_dbPath}");
        conn.Open();
        var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM Queue WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.ExecuteNonQuery();
    }

    public void IncrementRetry(long id)
    {
        using var conn = new SqliteConnection($"Data Source={_dbPath}");
        conn.Open();
        var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE Queue SET retryCount = retryCount + 1 WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.ExecuteNonQuery();
    }

    public int PendingCount()
    {
        using var conn = new SqliteConnection($"Data Source={_dbPath}");
        conn.Open();
        var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM Queue WHERE status = 'pending'";
        return Convert.ToInt32(cmd.ExecuteScalar());
    }

    public void Dispose() { }
}

public class QueueItem
{
    public long Id { get; set; }
    public string EncryptedPayload { get; set; } = string.Empty;
    public string EncryptedKey { get; set; } = string.Empty;
    public string Metadata { get; set; } = string.Empty;
    public int RetryCount { get; set; }
}
