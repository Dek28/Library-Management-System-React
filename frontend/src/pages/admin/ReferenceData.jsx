import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PageHeader, Card, DataTable, Pagination, Button, IconButton, SearchInput,
  Modal, Input, Textarea, Select, Checkbox, Badge, Tabs,
} from '../../components/ui';
import { referenceApi } from '../../api/endpoints';
import useListQuery from '../../hooks/useListQuery';
import { useAuthStore } from '../../store/auth';
import { P } from '../../constants';
import { referenceSchema } from '../../validators/schemas';
import { cleanParams, humanize } from '../../utils/format';

/**
 * One screen for every configurable vocabulary.
 * Each collection declares only the extra fields it needs; the shared code,
 * name, description and active flag are handled once.
 */
const COLLECTIONS = [
  { key: 'faculties', label: 'Faculties', extra: [{ name: 'dean', label: 'Dean', type: 'text' }] },
  {
    key: 'departments',
    label: 'Departments',
    extra: [
      { name: 'faculty', label: 'Faculty', type: 'ref', collection: 'faculties', required: true },
      { name: 'head', label: 'Head of department', type: 'text' },
    ],
    columns: [{ key: 'faculty', header: 'Faculty', render: (row) => row.faculty?.name || '-' }],
  },
  {
    key: 'programs',
    label: 'Programs',
    extra: [
      { name: 'department', label: 'Department', type: 'ref', collection: 'departments', required: true },
      {
        name: 'level',
        label: 'Level',
        type: 'select',
        options: ['certificate', 'diploma', 'bachelor', 'master', 'phd', 'other'].map((v) => ({ value: v, label: humanize(v) })),
      },
      { name: 'durationYears', label: 'Duration (years)', type: 'number' },
    ],
    columns: [
      { key: 'department', header: 'Department', render: (row) => row.department?.name || '-' },
      { key: 'level', header: 'Level', render: (row) => humanize(row.level) },
    ],
  },
  {
    key: 'categories',
    label: 'Categories',
    extra: [{ name: 'deweyRange', label: 'Dewey range', type: 'text' }],
    columns: [{ key: 'deweyRange', header: 'Dewey range' }],
  },
  {
    key: 'subjects',
    label: 'Subjects',
    extra: [{ name: 'category', label: 'Category', type: 'ref', collection: 'categories' }],
    columns: [{ key: 'category', header: 'Category', render: (row) => row.category?.name || '-' }],
  },
  {
    key: 'publishers',
    label: 'Publishers',
    extra: [
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'website', label: 'Website', type: 'text' },
      { name: 'contactEmail', label: 'Contact email', type: 'text' },
    ],
    columns: [{ key: 'country', header: 'Country' }],
  },
  { key: 'languages', label: 'Languages', extra: [] },
  {
    key: 'shelves',
    label: 'Shelves',
    extra: [
      { name: 'section', label: 'Section', type: 'text' },
      { name: 'rack', label: 'Rack', type: 'text' },
      { name: 'floor', label: 'Floor', type: 'text' },
      { name: 'capacity', label: 'Capacity', type: 'number' },
    ],
    columns: [
      { key: 'section', header: 'Section' },
      { key: 'rack', header: 'Rack' },
      { key: 'capacity', header: 'Capacity', align: 'right' },
    ],
  },
  {
    key: 'study-spaces',
    label: 'Study spaces',
    extra: [
      {
        name: 'spaceType',
        label: 'Type',
        type: 'select',
        options: ['room', 'table', 'carrel', 'hall'].map((v) => ({ value: v, label: humanize(v) })),
      },
      { name: 'capacity', label: 'Seats', type: 'number' },
      { name: 'location', label: 'Location', type: 'text' },
    ],
    columns: [
      { key: 'spaceType', header: 'Type', render: (row) => humanize(row.spaceType) },
      { key: 'capacity', header: 'Seats', align: 'right' },
      { key: 'location', header: 'Location' },
    ],
  },
];

function ReferenceForm({ collection, record, open, onClose, onSaved }) {
  const definition = COLLECTIONS.find((c) => c.key === collection);
  const isEdit = Boolean(record);

  // Load option lists for any `ref` fields this collection declares.
  const refFields = (definition.extra || []).filter((field) => field.type === 'ref');
  const { data: refOptions } = useQuery({
    queryKey: ['reference', 'options', collection],
    queryFn: async () => {
      const entries = await Promise.all(refFields.map(async (field) => {
        const result = await referenceApi.list(field.collection, { limit: 200 });
        return [field.name, result.items];
      }));
      return Object.fromEntries(entries);
    },
    enabled: open && refFields.length > 0,
    staleTime: 5 * 60_000,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(referenceSchema.passthrough()),
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const values = { code: record.code, name: record.name, description: record.description || '', isActive: record.isActive };
      (definition.extra || []).forEach((field) => {
        const value = record[field.name];
        values[field.name] = value && typeof value === 'object' ? (value.id || value._id) : (value ?? '');
      });
      reset(values);
    } else {
      reset({ code: '', name: '', description: '', isActive: true });
    }
  }, [open, isEdit, record, definition, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = cleanParams(values);
      payload.isActive = Boolean(values.isActive);
      if (isEdit) {
        await referenceApi.update(collection, record.id, payload);
        toast.success('Record updated');
      } else {
        await referenceApi.create(collection, payload);
        toast.success('Record created');
      }
      onSaved();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const singular = definition.label.replace(/ies$/, 'y').replace(/s$/, '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="reference-form" type="submit" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create'}
          </Button>
        </>
      )}
    >
      <form id="reference-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Code" required hint="Short unique code, e.g. CS" error={errors.code?.message} {...register('code')} />
          <Input label="Name" required error={errors.name?.message} {...register('name')} />
        </div>

        {(definition.extra || []).length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {definition.extra.map((field) => {
              if (field.type === 'ref') {
                return (
                  <Select
                    key={field.name}
                    label={field.label}
                    required={field.required}
                    placeholder="Not set"
                    options={(refOptions?.[field.name] || []).map((item) => ({ value: item.id, label: item.name }))}
                    {...register(field.name)}
                  />
                );
              }
              if (field.type === 'select') {
                return <Select key={field.name} label={field.label} options={field.options} {...register(field.name)} />;
              }
              return (
                <Input
                  key={field.name}
                  label={field.label}
                  type={field.type === 'number' ? 'number' : 'text'}
                  {...register(field.name)}
                />
              );
            })}
          </div>
        )}

        <Textarea label="Description" rows={2} {...register('description')} />
        <Checkbox label="Active" description="Inactive records stay in history but cannot be selected on new forms." {...register('isActive')} />
      </form>
    </Modal>
  );
}

export default function ReferenceData() {
  const can = useAuthStore((state) => state.can);
  const [collection, setCollection] = useState('faculties');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const definition = COLLECTIONS.find((c) => c.key === collection);

  const list = useListQuery({
    queryKey: ['reference', collection],
    queryFn: (params) => referenceApi.list(collection, params),
    initialLimit: 25,
  });

  const remove = async () => {
    setBusy(true);
    try {
      await referenceApi.remove(collection, toDelete.id);
      toast.success('Record deleted');
      setToDelete(null);
      list.refetch();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'code', header: 'Code', primary: true, render: (row) => <span className="font-medium text-slate-800">{row.code}</span> },
    { key: 'name', header: 'Name' },
    ...(definition.columns || []).map((column) => ({ ...column, hideOnMobile: true })),
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (row.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (can(P.REFERENCE_MANAGE) ? (
        <div className="flex justify-end gap-0.5">
          <IconButton icon={Pencil} label="Edit" tone="success" onClick={() => { setEditing(row); setFormOpen(true); }} />
          <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => setToDelete(row)} />
        </div>
      ) : null),
    },
  ];

  return (
    <>
      <PageHeader
        title="Reference data"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Reference data' }]}
        description="The configurable vocabularies the catalogue and member records point at."
        actions={can(P.REFERENCE_MANAGE) && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            Add {definition.label.replace(/ies$/, 'y').replace(/s$/, '').toLowerCase()}
          </Button>
        )}
      />

      <Card noPadding>
        <Tabs
          className="px-2"
          tabs={COLLECTIONS.map((c) => ({ key: c.key, label: c.label }))}
          value={collection}
          onChange={(key) => { setCollection(key); list.resetFilters(); }}
        />

        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          <SearchInput
            value={list.search}
            onChange={(e) => list.onSearchChange(e.target.value)}
            placeholder={`Search ${definition.label.toLowerCase()}…`}
            wrapperClassName="min-w-[220px] flex-1"
            aria-label={`Search ${definition.label}`}
          />
        </div>

        <DataTable
          columns={columns}
          rows={list.items}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          emptyTitle={`No ${definition.label.toLowerCase()} configured`}
          emptyAction={can(P.REFERENCE_MANAGE)
            ? <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>Add the first one</Button>
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

      <ReferenceForm
        collection={collection}
        record={editing}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); list.refetch(); }}
      />

      <ConfirmDeleteDialog
        record={toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        busy={busy}
      />
    </>
  );
}

/** Split out so the copy can explain why a delete may be refused. */
function ConfirmDeleteDialog({ record, onClose, onConfirm, busy }) {
  return (
    <Modal
      open={Boolean(record)}
      onClose={onClose}
      title="Delete this record?"
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>Delete</Button>
        </>
      )}
    >
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">{record?.name}</span> will be deleted. If catalogue
        records or members still reference it, the deletion is refused. Deactivate it instead so
        existing data stays intact.
      </p>
    </Modal>
  );
}
