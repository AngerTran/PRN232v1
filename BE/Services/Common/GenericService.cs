using System.Linq.Expressions;
using PRN232v1.Common;
using PRN232v1.Repositories;

namespace PRN232v1.Services.Common;

public class GenericService<TEntity> where TEntity : class
{
    protected readonly UnitOfWork UnitOfWork;
    protected Repository<TEntity> Repository => UnitOfWork.Repository<TEntity>();

    public GenericService(UnitOfWork unitOfWork)
    {
        UnitOfWork = unitOfWork;
    }

    public virtual Task<TEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => Repository.GetByIdAsync(id, cancellationToken: cancellationToken);

    public virtual Task<IReadOnlyList<TEntity>> GetAllAsync(CancellationToken cancellationToken = default)
        => Repository.GetAllAsync(cancellationToken: cancellationToken);

    public virtual Task<IReadOnlyList<TEntity>> FindAsync(
        Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken = default)
        => Repository.FindAsync(predicate, cancellationToken: cancellationToken);

    public virtual Task<PagedResult<TEntity>> GetPagedAsync(
        int page,
        int pageSize,
        Expression<Func<TEntity, bool>>? predicate = null,
        Func<IQueryable<TEntity>, IOrderedQueryable<TEntity>>? orderBy = null,
        CancellationToken cancellationToken = default)
        => Repository.GetPagedAsync(page, pageSize, predicate, orderBy, cancellationToken: cancellationToken);

    public virtual async Task<TEntity> CreateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        await Repository.AddAsync(entity, cancellationToken);
        await UnitOfWork.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public virtual async Task<TEntity> UpdateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        Repository.Update(entity);
        await UnitOfWork.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public virtual async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await Repository.GetByIdAsync(id, asNoTracking: false, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        Repository.Remove(entity);
        await UnitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public virtual Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
        => Repository.ExistsAsync(id, cancellationToken);
}
