const express = require('express');
const controller = require('../../controllers/author.controller');
const validate = require('../../middleware/validate');
const { authenticate, requirePermission } = require('../../middleware/auth');
const { idParam, paginationQuery, booleanish, z } = require('../../validators/common.validator');
const { authorBody, authorUpdateBody } = require('../../validators/reference.validator');
const { P } = require('../../constants/permissions');

const router = express.Router();
router.use(authenticate);

const listQuery = paginationQuery.extend({
  isActive: booleanish.optional(),
  nationality: z.string().optional(),
});

router.get('/', requirePermission(P.RESOURCE_VIEW), validate({ query: listQuery }), controller.list);
router.post('/', requirePermission(P.RESOURCE_CREATE), validate({ body: authorBody }), controller.create);
router.get('/:id', requirePermission(P.RESOURCE_VIEW), validate({ params: idParam(), query: paginationQuery }), controller.getOne);
router.patch('/:id', requirePermission(P.RESOURCE_UPDATE), validate({ params: idParam(), body: authorUpdateBody }), controller.update);
router.delete('/:id', requirePermission(P.RESOURCE_DELETE), validate({ params: idParam() }), controller.remove);

module.exports = router;
