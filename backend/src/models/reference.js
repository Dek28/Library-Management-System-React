/**
 * Reference/lookup collections.
 *
 * These are the configurable vocabularies the catalogue and user records point
 * at. They share a small base shape (code + name + active flag) so the generic
 * reference controller can serve all of them with one set of handlers.
 */
const mongoose = require('mongoose');
const { toJSONPlugin, softDeletePlugin, authorshipPlugin } = require('./plugins/common');

const { Schema } = mongoose;

function baseReferenceSchema(extra = {}, options = {}) {
  const schema = new Schema(
    {
      code: { type: String, required: true, trim: true, uppercase: true },
      name: { type: String, required: true, trim: true },
      description: { type: String, trim: true, default: '' },
      isActive: { type: Boolean, default: true, index: true },
      ...extra,
    },
    { timestamps: true, ...options },
  );
  schema.plugin(toJSONPlugin);
  schema.plugin(softDeletePlugin);
  schema.plugin(authorshipPlugin);
  schema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
  schema.index({ name: 1 });
  return schema;
}

const facultySchema = baseReferenceSchema({
  dean: { type: String, trim: true, default: '' },
});

const departmentSchema = baseReferenceSchema({
  faculty: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
  head: { type: String, trim: true, default: '' },
});

const programSchema = baseReferenceSchema({
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  level: { type: String, enum: ['certificate', 'diploma', 'bachelor', 'master', 'phd', 'other'], default: 'bachelor' },
  durationYears: { type: Number, min: 1, max: 10, default: 3 },
});

const categorySchema = baseReferenceSchema({
  parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  deweyRange: { type: String, trim: true, default: '' },
});

const subjectSchema = baseReferenceSchema({
  category: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
});

const publisherSchema = baseReferenceSchema({
  country: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  contactEmail: { type: String, trim: true, lowercase: true, default: '' },
});

const languageSchema = baseReferenceSchema({});

const shelfSchema = baseReferenceSchema({
  section: { type: String, trim: true, default: '' },
  rack: { type: String, trim: true, default: '' },
  floor: { type: String, trim: true, default: '' },
  capacity: { type: Number, min: 0, default: 0 },
});

const studySpaceSchema = baseReferenceSchema({
  spaceType: { type: String, enum: ['room', 'table', 'carrel', 'hall'], default: 'table' },
  capacity: { type: Number, min: 1, default: 6 },
  location: { type: String, trim: true, default: '' },
});

const authorSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true, index: true },
    biography: { type: String, trim: true, default: '' },
    nationality: { type: String, trim: true, default: '' },
    birthYear: { type: Number, default: null },
    deathYear: { type: Number, default: null },
    affiliation: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
authorSchema.plugin(toJSONPlugin);
authorSchema.plugin(softDeletePlugin);
authorSchema.plugin(authorshipPlugin);
authorSchema.index({ fullName: 'text', lastName: 'text' }, { name: 'author_text_search' });
authorSchema.pre('save', function setFullName(next) {
  this.fullName = `${this.firstName} ${this.lastName}`.trim();
  next();
});

const Faculty = mongoose.model('Faculty', facultySchema);
const Department = mongoose.model('Department', departmentSchema);
const Program = mongoose.model('Program', programSchema);
const Category = mongoose.model('Category', categorySchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Publisher = mongoose.model('Publisher', publisherSchema);
const Language = mongoose.model('Language', languageSchema);
const Shelf = mongoose.model('Shelf', shelfSchema);
const StudySpace = mongoose.model('StudySpace', studySpaceSchema);
const Author = mongoose.model('Author', authorSchema);

module.exports = {
  Faculty, Department, Program, Category, Subject,
  Publisher, Language, Shelf, StudySpace, Author,
};
