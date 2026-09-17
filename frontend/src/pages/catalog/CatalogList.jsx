import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PageHeader, Card, DataTable, Pagination, Button, IconButton, SearchInput,
  Select, StatusBadge, ConfirmDialog, Badge,
} from '../../components/ui';
import { resourceApi, referenceApi, authorApi } from '../../api/endpoints';
import useListQuery from '../../hooks/useListQuery';
import { useAuthStore } from '../../store/auth';
import { P, RESOURCE_TYPES } from '../../constants';
import { humanize, truncate } from '../../utils/format';

export default function CatalogList() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const can = useAuthStore((state) => state.can);
  const [showFilters, setShowFilters] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = useListQuery({
    queryKey: 'resources',
    queryFn: resourceApi.search,
    initialFilters: {
      q: params.get('q') || '',
      author: params.get('author') || '',
      resourceType: params.get('resourceType') || '',
      category: '',
      availability: '',
    },
  });

  // Reference data for the filter selects, loaded once and cached.
  const { data: categories } = useQuery({
    queryKey: ['reference', 'categories', 'options'],
    queryFn: () => referenceApi.list('categories', { limit: 200, isActive: true }),
    staleTime: 5 * 60_000,
  });
  const { data: authors } = useQuery({
    queryKey: ['authors', 'options'],
    queryFn: () => authorApi.list({ limit: 200 }),
    staleTime: 5 * 60_000,
  });

  const remove = async () => {
    setDeleting(true);
    try {
      await resourceApi.remove(toDelete.id);
      toast.success('Catalogue record deleted');
      setToDelete(null);
      list.refetch();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const exportAs = async (format) => {
    try {
      await resourceApi.export(list.params, format);
      toast.success(`Catalogue exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <Link to={`/catalog/${row.id}`} className="font-medium text-slate-800 hover:text-brand-600">
            {truncate(row.title, 70)}
          </Link>
          {row.subtitle && <p className="truncate text-xs text-slate-500">{truncate(row.subtitle, 60)}</p>}
        </div>
      ),
    },
    {
      key: 'authors',
      header: 'Author',
      render: (row) => (row.authors || []).map((a) => a.fullName).join(', ') || '-',
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (row) => row.category?.name || '-',
    },
    { key: 'isbn', header: 'ISBN', hideOnMobile: true, render: (row) => row.isbn || '-' },
    {
      key: 'availableCopies',
      header: 'Copies',
      align: 'center',
      render: (row) => (
        <span className="whitespace-nowrap text-xs">
          <span className={row.availableCopies > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>
            {row.availableCopies}
          </span>
          <span className="text-slate-400"> / {row.totalCopies}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-0.5">
          <IconButton icon={Eye} label="View details" onClick={() => navigate(`/catalog/${row.id}`)} />
          {can(P.RESOURCE_UPDATE) && (
            <IconButton icon={Pencil} label="Edit" tone="success" onClick={() => navigate(`/catalog/${row.id}/edit`)} />
          )}
          {can(P.RESOURCE_DELETE) && (
            <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => setToDelete(row)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Books Catalog"
        breadcrumbs={[{ label: 'Catalog', to: '/catalog' }, { label: 'Books' }]}
        actions={(
          <>
            <Button variant="secondary" onClick={() => exportAs('xlsx')}>Export</Button>
            {can(P.RESOURCE_CREATE) && <Button as={Link} to="/catalog/new">Add Book</Button>}
          </>
        )}
      />

      <Card noPadding>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          <SearchInput
            value={list.search}
            onChange={(e) => list.onSearchChange(e.target.value)}
            placeholder="Search by title, author, ISBN or keyword…"
            wrapperClassName="min-w-[240px] flex-1"
            aria-label="Search the catalogue"
          />
          <Button
            variant="secondary"
            onClick={() => setShowFilters((v) => !v)}
          >
            Filters{list.activeFilterCount > 0 && ` (${list.activeFilterCount})`}
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-3 border-b border-line bg-slate-50/60 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Resource type"
              placeholder="All types"
              options={RESOURCE_TYPES}
              value={list.filters.resourceType || ''}
              onChange={(e) => list.setFilter('resourceType', e.target.value)}
            />
            <Select
              label="Category"
              placeholder="All categories"
              options={(categories?.items || []).map((c) => ({ value: c.id, label: c.name }))}
              value={list.filters.category || ''}
              onChange={(e) => list.setFilter('category', e.target.value)}
            />
            <Select
              label="Author"
              placeholder="All authors"
              options={(authors?.items || []).map((a) => ({ value: a.id, label: a.fullName }))}
              value={list.filters.author || ''}
              onChange={(e) => list.setFilter('author', e.target.value)}
            />
            <Select
              label="Availability"
              placeholder="Any availability"
              options={[
                { value: 'available', label: 'On the shelf' },
                { value: 'unavailable', label: 'All copies out' },
              ]}
              value={list.filters.availability || ''}
              onChange={(e) => list.setFilter('availability', e.target.value)}
            />
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button variant="ghost" size="sm" onClick={list.resetFilters}>Clear filters</Button>
              <span className="text-xs text-slate-500">{list.meta.total} matching record(s)</span>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={list.items}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          sort={list.sort}
          onSortChange={list.setSort}
          emptyTitle="No catalogue records found"
          emptyDescription="Try a different search term or clear the filters."
          emptyAction={can(P.RESOURCE_CREATE)
            ? <Button as={Link} to="/catalog/new" size="sm">Add the first book</Button>
            : undefined}
        />

        <div className="border-t border-line">
          <Pagination
            page={list.meta.page}
            limit={list.meta.limit}
            total={list.meta.total}
            onPageChange={list.setPage}
            onLimitChange={list.onLimitChange}
          />
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this catalogue record?"
        confirmLabel="Delete record"
        message={`"${toDelete?.title}" and its ${toDelete?.totalCopies || 0} copy/copies will be removed from the catalogue. Loan history is preserved, and the deletion is refused if any copy is currently on loan.`}
      />
    </>
  );
}
