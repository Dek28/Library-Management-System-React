const {
  as, ensureRoles, ensureSettings, createAndSignIn, createResource,
  resetDatabase, models,
} = require('../helpers');

const { Resource, ResourceCopy, Loan } = models;

describe('Catalogue and copies', () => {
  let librarian;
  let student;
  let admin;

  beforeAll(async () => {
    await resetDatabase();
    await ensureRoles();
    await ensureSettings();
    librarian = await createAndSignIn('librarian');
    student = await createAndSignIn('student', { registrationNumber: 'REG/CAT/0001' });
    admin = await createAndSignIn('super_admin');
  });

  afterAll(resetDatabase);

  beforeEach(async () => {
    await Promise.all([Loan.deleteMany({}), ResourceCopy.deleteMany({}), Resource.deleteMany({})]);
  });

  describe('records', () => {
    it('creates a catalogue record', async () => {
      const response = await as(librarian.token).post('/resources', {
        title: 'Introduction to Algorithms',
        resourceType: 'book',
        isbn: '9780262046305',
        publicationYear: 2022,
        keywords: ['Algorithms', 'Computing'],
      });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('Introduction to Algorithms');
      // Keywords are normalised to lower case for the search index.
      expect(response.body.data.keywords).toEqual(['algorithms', 'computing']);
      expect(response.body.data.totalCopies).toBe(0);
    });

    it('rejects an invalid payload with field-level errors', async () => {
      const response = await as(librarian.token).post('/resources', { title: '', resourceType: 'nonsense' });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['title']));
    });

    it('rejects a duplicate ISBN', async () => {
      await as(librarian.token).post('/resources', { title: 'First', resourceType: 'book', isbn: '9780000000001' });
      const duplicate = await as(librarian.token).post('/resources', {
        title: 'Second', resourceType: 'book', isbn: '9780000000001',
      });

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.message).toMatch(/already exists/i);
    });

    it('rejects an implausible publication year', async () => {
      const response = await as(librarian.token).post('/resources', {
        title: 'From the future',
        resourceType: 'book',
        publicationYear: 3000,
      });
      expect(response.status).toBe(422);
    });

    it('does not let a student create a record', async () => {
      const response = await as(student.token).post('/resources', { title: 'Nope', resourceType: 'book' });
      expect(response.status).toBe(403);
    });
  });

  describe('copies and availability', () => {
    it('generates accession numbers and barcodes for a batch of copies', async () => {
      const created = await as(librarian.token).post('/resources', { title: 'Batch title', resourceType: 'book' });

      const batch = await as(librarian.token).post('/resource-copies/batch', {
        resource: created.body.data.id,
        quantity: 3,
      });

      expect(batch.status).toBe(201);
      expect(batch.body.data).toHaveLength(3);

      const accessionNumbers = batch.body.data.map((copy) => copy.accessionNumber);
      const barcodes = batch.body.data.map((copy) => copy.barcode);
      expect(new Set(accessionNumbers).size).toBe(3);
      expect(new Set(barcodes).size).toBe(3);

      const resource = await Resource.findById(created.body.data.id);
      expect(resource.totalCopies).toBe(3);
      expect(resource.availableCopies).toBe(3);
    });

    it('keeps availability counters in step as copies circulate', async () => {
      const { resource, copies } = await createResource({ copyCount: 3 });

      await as(librarian.token).post('/loans/issue', {
        userIdentifier: 'REG/CAT/0001',
        copyIdentifier: copies[0].barcode,
      });

      let refreshed = await Resource.findById(resource._id);
      expect(refreshed.availableCopies).toBe(2);
      expect(refreshed.borrowedCopies).toBe(1);

      await as(librarian.token).post('/loans/return', { copyIdentifier: copies[0].barcode });

      refreshed = await Resource.findById(resource._id);
      expect(refreshed.availableCopies).toBe(3);
      expect(refreshed.borrowedCopies).toBe(0);
    });

    it('refuses a manual status change to a circulation-owned status', async () => {
      const { copies } = await createResource({ copyCount: 1 });

      const response = await as(librarian.token).patch(`/resource-copies/${copies[0]._id}`, { status: 'borrowed' });

      // The value is a valid status, just not one a librarian may set by hand.
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/set by circulation/i);
    });

    it('refuses to change the status of a copy that is on loan', async () => {
      const { copies } = await createResource({ copyCount: 1 });
      await as(librarian.token).post('/loans/issue', {
        userIdentifier: 'REG/CAT/0001',
        copyIdentifier: copies[0].barcode,
      });

      const response = await as(librarian.token).patch(`/resource-copies/${copies[0]._id}`, { status: 'damaged' });

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/on loan/i);
    });

    it('resolves a copy from a scanned barcode or accession number', async () => {
      const { copies } = await createResource({ copyCount: 1 });

      const byBarcode = await as(librarian.token).get(`/resource-copies/lookup?identifier=${copies[0].barcode}`);
      const byAccession = await as(librarian.token).get(`/resource-copies/lookup?identifier=${copies[0].accessionNumber}`);
      const unknown = await as(librarian.token).get('/resource-copies/lookup?identifier=does-not-exist');

      expect(byBarcode.status).toBe(200);
      expect(byAccession.status).toBe(200);
      expect(byBarcode.body.data.id).toBe(byAccession.body.data.id);
      expect(unknown.status).toBe(404);
    });
  });

  describe('deletion rules', () => {
    it('refuses to delete a title while a copy is on loan', async () => {
      const { resource, copies } = await createResource({ copyCount: 1 });
      await as(librarian.token).post('/loans/issue', {
        userIdentifier: 'REG/CAT/0001',
        copyIdentifier: copies[0].barcode,
      });

      const response = await as(admin.token).delete(`/resources/${resource._id}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/on loan/i);
    });

    it('withdraws rather than deletes a copy that has loan history', async () => {
      const { copies } = await createResource({ copyCount: 1 });
      await as(librarian.token).post('/loans/issue', {
        userIdentifier: 'REG/CAT/0001',
        copyIdentifier: copies[0].barcode,
      });
      await as(librarian.token).post('/loans/return', { copyIdentifier: copies[0].barcode });

      const response = await as(librarian.token).delete(`/resource-copies/${copies[0]._id}`);
      expect(response.status).toBe(200);

      const copy = await ResourceCopy.findById(copies[0]._id);
      expect(copy).not.toBeNull();
      expect(copy.status).toBe('withdrawn');
      // The loan history stays resolvable.
      expect(await Loan.countDocuments({ copy: copies[0]._id })).toBe(1);
    });
  });

  describe('search', () => {
    it('finds a title by a word in the title', async () => {
      await createResource({ title: 'Fundamentals of Nursing Practice', copyCount: 1 });
      await createResource({ title: 'Database System Concepts', copyCount: 1 });

      const response = await as(student.token).get('/resources?q=nursing');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toMatch(/Nursing/);
    });

    it('falls back to substring matching for a partial word', async () => {
      await createResource({ title: 'Advanced Engineering Mathematics', copyCount: 1 });

      // "Engineer" is not a whole word in the title, so the text index alone
      // would miss it.
      const response = await as(student.token).get('/resources?q=Engineer');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by availability', async () => {
      const available = await createResource({ title: 'On the shelf', copyCount: 1 });
      const lent = await createResource({ title: 'All out', copyCount: 1 });

      await as(librarian.token).post('/loans/issue', {
        userIdentifier: 'REG/CAT/0001',
        copyIdentifier: lent.copies[0].barcode,
      });

      const onShelf = await as(student.token).get('/resources?availability=available');
      const allOut = await as(student.token).get('/resources?availability=unavailable');

      expect(onShelf.body.data.map((r) => r.title)).toContain('On the shelf');
      expect(allOut.body.data.map((r) => r.title)).toContain('All out');
    });

    it('paginates results and reports the totals', async () => {
      for (let index = 0; index < 5; index += 1) {
        // eslint-disable-next-line no-await-in-loop
        await createResource({ title: `Paged title ${index}`, copyCount: 1 });
      }

      const response = await as(student.token).get('/resources?page=1&limit=2');

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(5);
      expect(response.body.meta.totalPages).toBe(3);
      expect(response.body.meta.hasNextPage).toBe(true);
    });

    it('caps the page size so a client cannot pull the whole collection', async () => {
      const response = await as(student.token).get('/resources?limit=5000');
      expect(response.status).toBe(422);
    });

    it('returns records with `id`, never `_id`', async () => {
      await createResource({ title: 'Shape check', copyCount: 1 });

      const response = await as(student.token).get('/resources?limit=1');

      expect(response.body.data[0].id).toEqual(expect.any(String));
      expect(response.body.data[0]._id).toBeUndefined();
      expect(response.body.data[0].__v).toBeUndefined();
    });
  });
});
