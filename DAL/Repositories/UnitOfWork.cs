using DAL.Data;

namespace DAL.Repositories;

public class UnitOfWork : IAsyncDisposable
{
    private readonly AppDbContext _context;
    private readonly Dictionary<Type, object> _repositories = new();
    private bool _disposed;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public AppDbContext Context => _context;

    public Repository<TEntity> Repository<TEntity>() where TEntity : class
    {
        var type = typeof(TEntity);
        if (!_repositories.TryGetValue(type, out var repository))
        {
            repository = new Repository<TEntity>(_context);
            _repositories[type] = repository;
        }

        return (Repository<TEntity>)repository;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        await _context.DisposeAsync();
        _disposed = true;
        GC.SuppressFinalize(this);
    }
}
