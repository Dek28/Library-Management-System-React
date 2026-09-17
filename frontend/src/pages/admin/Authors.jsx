import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PageHeader, Card, DataTable, Pagination, Button, IconButton, SearchInput,
  Modal, Input, Textarea, Checkbox, ConfirmDialog, Badge,
} from '../../components/ui';
import { authorApi } from '../../api/endpoints';
import useListQuery from '../../hooks/useListQuery';
import { useAuthStore } from '../../store/auth';
import { P } from '../../constants';
import { authorSchema } from '../../validators/schemas';
import { cleanParams } from '../../utils/format';

function AuthorForm({ author, open, onClose, onSaved }) {
  const isEdit = Boolean(author);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(authorSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(isEdit
      ? {
        firstName: author.firstName,
        lastName: author.lastName,
        affiliation: author.affiliation || '',
        nationality: author.nationality || '',
        biography: author.biography || '',
        email: author.email || '',
      }
      : { firstName: '', lastName: '', affiliation: '', nationality: '', biography: '', email: '' });
  }, [open, isEdit, author, reset]);

  const onSubmit = async (values) => {
    try {
      if (isEdit) {
        await authorApi.update(author.id, cleanParams(values));
        toast.success('Author updated');
      } else {
        await authorApi.create(cleanParams(values));
        toast.success('Author added');
      }
      onSaved();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit author' : 'Add author'}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="author-form" type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Add author'}</Button>
        </>
      )}
    >
      <form id="author-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" required error={errors.firstName?.message} {...register('firstName')} />
          <Input label="Last name" required error={errors.lastName?.message} {...register('lastName')} />
          <Input label="Affiliation" error={errors.affiliation?.message} {...register('affiliation')} />
          <Input label="Nationality" error={errors.nationality?.message} {...register('nationality')} />
          <Input label="Email" type="email" wrapperClassName="sm:col-span-2" error={errors.email?.message} {...register('email')} />
        </div>
        <Textarea label="Biography" rows={4} error={errors.biography?.message} {...register('biography')} />
      </form>
    </Modal>
  );
}

export default function Authors() {
  const can = useAuthStore((state) => state.can);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = useListQuery({
    queryKey: ['authors'],
    queryFn: authorApi.list,
    initialLimit: 25,
  });

  const remove = async () => {
    setBusy(true);
    try {
      await authorApi.remove(toDelete.id);
      toast.success('Author deleted');
      setToDelete(null);
      list.refetch();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'fullName',
      header: 'Author',
      primary: true,
      render: (row) => (
        <Link to={`/catalog?author=${row.id}`} className="font-medium text-slate-800 hover:text-brand-600">
          {row.fullName || `${row.firstName} ${row.lastName}`}
        </Link>
      ),
    },
    { key: 'affiliation', header: 'Affiliation', render: (row) => row.affiliation || '-' },
    { key: 'nationality', header: 'Nationality', hideOnMobile: true, render: (row) => row.nationality || '-' },
    { key: 'email', header: 'Email', hideOnMobile: true, render: (row) => row.email || '-' },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (row.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-0.5">
          <IconButton
            icon={BookOpen}
            label="View titles"
            onClick={() => { window.location.href = `/catalog?author=${row.id}`; }}
          />
          {can(P.RESOURCE_UPDATE) && (
            <IconButton icon={Pencil} label="Edit author" tone="success" onClick={() => { setEditing(row); setFormOpen(true); }} />
          )}
          {can(P.RESOURCE_DELETE) && (
            <IconButton icon={Trash2} label="Delete author" tone="danger" onClick={() => setToDelete(row)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Authors"
        breadcrumbs={[{ label: 'Catalog', to: '/catalog' }, { label: 'Authors' }]}
        description="The author register the catalogue attributes titles to."
        actions={can(P.RESOURCE_CREATE) && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>Add author</Button>
        )}
      />

      <Card noPadding>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          <SearchInput
            value={list.search}
            onChange={(e) => list.onSearchChange(e.target.value)}
            placeholder="Search authors by name or affiliation…"
            wrapperClassName="min-w-[220px] flex-1"
            aria-label="Search authors"
          />
        </div>

        <DataTable
          columns={columns}
          rows={list.items}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle="No authors registered"
          emptyDescription="Add authors so they can be attached to catalogue records."
          emptyAction={can(P.RESOURCE_CREATE)
            ? <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>Add author</Button>
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

      <AuthorForm
        author={editing}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); list.refetch(); }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete this author?"
        confirmLabel="Delete author"
        message={`${toDelete?.fullName} will be removed. Deletion is refused while catalogue records are attributed to them.`}
      />
    </>
  );
}
