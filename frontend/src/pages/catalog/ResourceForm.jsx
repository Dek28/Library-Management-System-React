import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PageHeader, Card, Button, Input, Select, Textarea, Checkbox, PageLoader, ErrorState, Badge,
} from '../../components/ui';
import { resourceApi, referenceApi, authorApi } from '../../api/endpoints';
import { resourceSchema } from '../../validators/schemas';
import { RESOURCE_TYPES } from '../../constants';
import { cleanParams } from '../../utils/format';

/** Multi-select rendered as a checkbox list, used for authors and subjects. */
function MultiSelect({ label, options, value = [], onChange, hint, emptyLabel }) {
  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div>
      <p className="form-label">{label}</p>
      <div className="max-h-44 overflow-y-auto rounded-md border border-line-strong bg-panel p-2">
        {options.length === 0 && <p className="px-1 py-2 text-xs text-slate-500">{emptyLabel}</p>}
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700">{option.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}

/** Free-form tag entry for keywords. */
function KeywordInput({ value = [], onChange }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const keyword = draft.trim().toLowerCase();
    if (keyword && !value.includes(keyword)) onChange([...value, keyword]);
    setDraft('');
  };

  return (
    <div>
      <p className="form-label">Keywords</p>
      <div className="flex gap-2">
        <input
          className="form-control"
          value={draft}
          placeholder="Type a keyword and press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          }}
        />
        <Button type="button" variant="secondary" onClick={add}>Add</Button>
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((keyword) => (
            <span key={keyword} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
              {keyword}
              <button type="button" onClick={() => onChange(value.filter((k) => k !== keyword))} aria-label={`Remove ${keyword}`}>
                <X className="h-3 w-3 text-slate-400 hover:text-slate-700" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="form-hint">Keywords power the catalogue's free-text search.</p>
    </div>
  );
}

export default function ResourceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [authors, setAuthors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [keywords, setKeywords] = useState([]);

  const { data: existing, isLoading, error } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => resourceApi.get(id),
    enabled: isEdit,
  });

  const options = useQuery({
    queryKey: ['catalog', 'form-options'],
    queryFn: async () => {
      const [categoryList, publisherList, languageList, departmentList, facultyList, subjectList, authorList] = await Promise.all([
        referenceApi.list('categories', { limit: 200 }),
        referenceApi.list('publishers', { limit: 200 }),
        referenceApi.list('languages', { limit: 100 }),
        referenceApi.list('departments', { limit: 200 }),
        referenceApi.list('faculties', { limit: 100 }),
        referenceApi.list('subjects', { limit: 200 }),
        authorApi.list({ limit: 200 }),
      ]);
      return {
        categories: categoryList.items,
        publishers: publisherList.items,
        languages: languageList.items,
        departments: departmentList.items,
        faculties: facultyList.items,
        subjects: subjectList.items,
        authors: authorList.items,
      };
    },
    staleTime: 5 * 60_000,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: { resourceType: 'book', isBorrowable: true, isReferenceOnly: false },
  });

  useEffect(() => {
    if (!existing) return;
    reset({
      title: existing.title,
      subtitle: existing.subtitle || '',
      resourceType: existing.resourceType,
      isbn: existing.isbn || '',
      issn: existing.issn || '',
      callNumber: existing.callNumber || '',
      publisher: existing.publisher?.id || '',
      publicationYear: existing.publicationYear || '',
      edition: existing.edition || '',
      volume: existing.volume || '',
      issue: existing.issue || '',
      language: existing.language?.id || '',
      pages: existing.pages || '',
      category: existing.category?.id || '',
      department: existing.department?.id || '',
      faculty: existing.faculty?.id || '',
      description: existing.description || '',
      acquisitionSource: existing.acquisitionSource || 'purchase',
      supplier: existing.supplier || '',
      purchasePrice: existing.purchasePrice ?? '',
      replacementCost: existing.replacementCost ?? '',
      isBorrowable: existing.isBorrowable,
      isReferenceOnly: existing.isReferenceOnly,
    });
    setAuthors((existing.authors || []).map((a) => a.id));
    setSubjects((existing.subjects || []).map((s) => s.id));
    setKeywords(existing.keywords || []);
  }, [existing, reset]);

  if (isEdit && isLoading) return <PageLoader label="Loading record…" />;
  if (isEdit && error) return <ErrorState message={error.message} />;

  const onSubmit = async (values) => {
    const payload = { ...cleanParams(values), authors, subjects, keywords };
    // Booleans are meaningful even when false, so restore them after cleaning.
    payload.isBorrowable = Boolean(values.isBorrowable);
    payload.isReferenceOnly = Boolean(values.isReferenceOnly);

    try {
      const saved = isEdit
        ? await resourceApi.update(id, payload)
        : await resourceApi.create(payload);
      toast.success(isEdit ? 'Catalogue record updated' : 'Catalogue record created');
      navigate(`/catalog/${saved.id}`);
    } catch (err) {
      toast.error(err.message);
      (err.errors || []).forEach((fieldError) => toast.error(`${fieldError.field}: ${fieldError.message}`));
    }
  };

  const asOptions = (items = [], labelKey = 'name') => items.map((item) => ({ value: item.id, label: item[labelKey] }));

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit Book' : 'Add Book'}
        breadcrumbs={[
          { label: 'Catalog', to: '/catalog' },
          { label: 'Books', to: '/catalog' },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
        actions={<Button as={Link} to={isEdit ? `/catalog/${id}` : '/catalog'} variant="secondary">Cancel</Button>}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Card title="Bibliographic details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Title" required wrapperClassName="sm:col-span-2" error={errors.title?.message} {...register('title')} />
            <Input label="Subtitle" wrapperClassName="sm:col-span-2" error={errors.subtitle?.message} {...register('subtitle')} />

            <Select label="Resource type" required options={RESOURCE_TYPES} error={errors.resourceType?.message} {...register('resourceType')} />
            <Select label="Category" placeholder="Uncategorised" options={asOptions(options.data?.categories)} error={errors.category?.message} {...register('category')} />

            <Input label="ISBN" placeholder="978…" error={errors.isbn?.message} {...register('isbn')} />
            <Input label="ISSN" error={errors.issn?.message} {...register('issn')} />

            <Select label="Publisher" placeholder="Unknown" options={asOptions(options.data?.publishers)} error={errors.publisher?.message} {...register('publisher')} />
            <Input label="Publication year" type="number" error={errors.publicationYear?.message} {...register('publicationYear')} />

            <Input label="Edition" error={errors.edition?.message} {...register('edition')} />
            <Select label="Language" placeholder="Unspecified" options={asOptions(options.data?.languages)} error={errors.language?.message} {...register('language')} />

            <Input label="Volume" error={errors.volume?.message} {...register('volume')} />
            <Input label="Issue" error={errors.issue?.message} {...register('issue')} />

            <Input label="Number of pages" type="number" error={errors.pages?.message} {...register('pages')} />
            <Input label="Call number" placeholder="005.13" error={errors.callNumber?.message} {...register('callNumber')} />
          </div>
        </Card>

        <Card title="Classification and discovery">
          <div className="grid gap-4 lg:grid-cols-2">
            <MultiSelect
              label="Authors"
              options={asOptions(options.data?.authors, 'fullName')}
              value={authors}
              onChange={setAuthors}
              emptyLabel="No authors registered yet."
              hint="Add authors under Catalog → Authors first if one is missing."
            />
            <MultiSelect
              label="Subjects"
              options={asOptions(options.data?.subjects)}
              value={subjects}
              onChange={setSubjects}
              emptyLabel="No subjects configured yet."
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select label="Faculty" placeholder="Not faculty-specific" options={asOptions(options.data?.faculties)} {...register('faculty')} />
            <Select label="Department" placeholder="Not department-specific" options={asOptions(options.data?.departments)} {...register('department')} />
          </div>

          <div className="mt-4">
            <KeywordInput value={keywords} onChange={setKeywords} />
          </div>

          <div className="mt-4">
            <Textarea label="Description / abstract" rows={5} error={errors.description?.message} {...register('description')} />
          </div>
        </Card>

        <Card title="Acquisition and circulation rules">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Acquisition source"
              options={[
                { value: 'purchase', label: 'Purchase' },
                { value: 'donation', label: 'Donation' },
                { value: 'exchange', label: 'Exchange' },
                { value: 'legal_deposit', label: 'Legal deposit' },
                { value: 'internal', label: 'Internal publication' },
                { value: 'other', label: 'Other' },
              ]}
              {...register('acquisitionSource')}
            />
            <Input label="Supplier or donor" error={errors.supplier?.message} {...register('supplier')} />
            <Input label="Purchase price" type="number" step="0.01" min="0" error={errors.purchasePrice?.message} {...register('purchasePrice')} />
            <Input
              label="Replacement cost"
              type="number"
              step="0.01"
              min="0"
              hint="Charged when a copy is lost."
              error={errors.replacementCost?.message}
              {...register('replacementCost')}
            />
          </div>

          <div className="mt-5 space-y-3 border-t border-line pt-4">
            <Checkbox
              label="Available for loan"
              description="Uncheck for items that must stay in the library."
              {...register('isBorrowable')}
            />
            <Checkbox
              label="Reference only"
              description="Reference items can be consulted in the library but never borrowed."
              {...register('isReferenceOnly')}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button as={Link} to={isEdit ? `/catalog/${id}` : '/catalog'} variant="secondary">Cancel</Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create record'}
          </Button>
        </div>
      </form>
    </>
  );
}
