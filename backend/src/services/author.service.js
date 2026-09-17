const { Author } = require('../models/reference');
const Resource = require('../models/Resource');
const ApiError = require('../utils/ApiError');
const auditService = require('./audit.service');
const { buildPagination, paginate, like, compact } = require('../utils/query');

async function list(query = {}) {
  const pagination = buildPagination(query, { defaultSort: 'lastName', defaultLimit: 50 });
  const filter = compact({ nationality: query.nationality });
  if (query.isActive !== undefined) filter.isActive = query.isActive === true || query.isActive === 'true';
  if (query.search) {
    filter.$or = [
      { firstName: like(query.search) },
      { lastName: like(query.search) },
      { fullName: like(query.search) },
      { affiliation: like(query.search) },
    ];
  }
  return paginate(Author, filter, pagination);
}

async function getById(id) {
  const author = await Author.findById(id);
  if (!author) throw ApiError.notFound('Author not found');
  return author;
}

/** An author plus the catalogue titles attributed to them. */
async function getWithResources(id, query = {}) {
  const author = await getById(id);
  const pagination = buildPagination(query, { defaultSort: '-publicationYear', defaultLimit: 20 });
  const resources = await paginate(Resource, { authors: author._id }, pagination, {
    select: 'title resourceType publicationYear status totalCopies availableCopies coverImage',
    populate: { path: 'publisher', select: 'name' },
  });
  return { author, resources };
}

async function create(payload, actor, context = {}) {
  const author = await Author.create({ ...payload, createdBy: actor?._id, updatedBy: actor?._id });
  await auditService.record({
    ...context, actor, action: 'reference_created', entityType: 'Author', entityId: author._id,
    entityLabel: author.fullName, newValue: author.toObject(),
  });
  return author;
}

async function update(id, payload, actor, context = {}) {
  const author = await getById(id);
  const before = author.toObject();
  author.set({ ...payload, updatedBy: actor?._id });
  await author.save();
  await auditService.record({
    ...context, actor, action: 'reference_updated', entityType: 'Author', entityId: author._id,
    entityLabel: author.fullName, oldValue: before, newValue: author.toObject(),
  });
  return author;
}

async function remove(id, actor, context = {}) {
  const author = await getById(id);
  const attributed = await Resource.countDocuments({ authors: author._id });
  if (attributed > 0) {
    throw ApiError.conflict(`Cannot delete: ${attributed} catalogue record(s) are attributed to this author.`);
  }
  await author.softDelete(actor?._id);
  await auditService.record({
    ...context, actor, action: 'reference_deleted', entityType: 'Author', entityId: author._id,
    entityLabel: author.fullName,
  });
  return true;
}

module.exports = { list, getById, getWithResources, create, update, remove };
