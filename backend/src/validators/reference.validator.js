const { z, objectId, optionalObjectId, paginationQuery, booleanish } = require('./common.validator');

const collectionParam = z.object({
  collection: z.enum([
    'faculties', 'departments', 'programs', 'categories', 'subjects',
    'publishers', 'languages', 'shelves', 'study-spaces',
  ]),
  id: objectId.optional(),
});

const listQuery = paginationQuery.extend({
  isActive: booleanish.optional(),
  faculty: objectId.optional(),
  department: objectId.optional(),
  category: objectId.optional(),
  parent: objectId.optional(),
  level: z.string().optional(),
  section: z.string().optional(),
  spaceType: z.string().optional(),
});

/**
 * One permissive body schema covers every lookup collection; Mongoose enforces
 * the per-collection required fields and enums on save.
 */
const referenceBody = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(''),
  isActive: z.boolean().optional(),

  faculty: optionalObjectId,
  department: optionalObjectId,
  category: optionalObjectId,
  parent: optionalObjectId,

  dean: z.string().trim().max(120).optional(),
  head: z.string().trim().max(120).optional(),
  level: z.enum(['certificate', 'diploma', 'bachelor', 'master', 'phd', 'other']).optional(),
  durationYears: z.coerce.number().int().min(1).max(10).optional(),
  deweyRange: z.string().trim().max(40).optional(),
  country: z.string().trim().max(60).optional(),
  website: z.string().trim().max(200).optional(),
  contactEmail: z.string().trim().max(120).optional(),
  section: z.string().trim().max(60).optional(),
  rack: z.string().trim().max(60).optional(),
  floor: z.string().trim().max(60).optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  spaceType: z.enum(['room', 'table', 'carrel', 'hall']).optional(),
  location: z.string().trim().max(120).optional(),
});

const referenceUpdateBody = referenceBody.partial();

const authorBody = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  biography: z.string().trim().max(2000).optional().default(''),
  nationality: z.string().trim().max(60).optional().default(''),
  birthYear: z.coerce.number().int().min(1000).max(2200).optional().nullable(),
  deathYear: z.coerce.number().int().min(1000).max(2200).optional().nullable(),
  affiliation: z.string().trim().max(160).optional().default(''),
  email: z.union([z.string().email(), z.literal('')]).optional().default(''),
  isActive: z.boolean().optional(),
});

module.exports = {
  collectionParam, listQuery, referenceBody, referenceUpdateBody,
  authorBody, authorUpdateBody: authorBody.partial(),
};
