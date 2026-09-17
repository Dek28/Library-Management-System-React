const catchAsync = require('../utils/catchAsync');
const { ok, created, paginated } = require('../utils/response');
const authorService = require('../services/author.service');

const list = catchAsync(async (req, res) => {
  const result = await authorService.list(req.query);
  return paginated(res, { items: result.items, page: result.page, limit: result.limit, total: result.total });
});

const getOne = catchAsync(async (req, res) =>
  ok(res, { message: 'Author loaded', data: await authorService.getWithResources(req.params.id, req.query) }));

const create = catchAsync(async (req, res) =>
  created(res, { message: 'Author created successfully', data: await authorService.create(req.body, req.user, { req }) }));

const update = catchAsync(async (req, res) =>
  ok(res, { message: 'Author updated successfully', data: await authorService.update(req.params.id, req.body, req.user, { req }) }));

const remove = catchAsync(async (req, res) => {
  await authorService.remove(req.params.id, req.user, { req });
  return ok(res, { message: 'Author deleted successfully' });
});

module.exports = { list, getOne, create, update, remove };
