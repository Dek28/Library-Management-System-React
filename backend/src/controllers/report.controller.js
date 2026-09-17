const catchAsync = require('../utils/catchAsync');
const { ok } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const { definitions, catalogue } = require('../reports/definitions');
const settingsService = require('../services/settings.service');
const fineService = require('../services/fine.service');
const clearanceService = require('../services/clearance.service');
const groupService = require('../services/readingGroup.service');
const inventoryService = require('../services/inventory.service');
const dashboardService = require('../services/dashboard.service');
const { buildWorkbook, sendWorkbook, sendCsv } = require('../reports/excel');
const { streamTableReport } = require('../reports/pdf');

const list = catchAsync(async (req, res) =>
  ok(res, { message: 'Available reports', data: catalogue() }));

/**
 * Runs one report and renders it in the requested format.
 * The same rows back JSON, XLSX, CSV and PDF so every output stays in step.
 */
const run = catchAsync(async (req, res) => {
  const definition = definitions[req.params.key];
  if (!definition) throw ApiError.notFound(`Unknown report "${req.params.key}"`);

  const { format = 'json', ...query } = req.query;
  const rows = await definition.load(query);

  if (format === 'json') {
    return ok(res, {
      message: definition.title,
      data: { key: req.params.key, title: definition.title, columns: definition.columns, rows },
      meta: { total: rows.length, generatedAt: new Date().toISOString() },
    });
  }

  const settings = await settingsService.getSettings();
  const period = query.from ? `${query.from} to ${query.to || 'today'}` : 'All available data';
  const meta = { generatedBy: req.user.fullName, period };
  const filename = `${req.params.key}.${format}`;

  if (format === 'csv') return sendCsv(res, definition.columns, rows, filename);

  if (format === 'pdf') {
    return streamTableReport(res, {
      filename,
      title: definition.title,
      subtitle: settings.institution.libraryName,
      institution: settings.institution,
      meta,
      columns: definition.columns,
      rows,
    });
  }

  const workbook = await buildWorkbook({
    title: definition.title,
    subtitle: settings.institution.libraryName,
    columns: definition.columns,
    rows,
    meta,
    sheetName: definition.title.slice(0, 28),
  });
  return sendWorkbook(res, workbook, filename);
});

/** Headline numbers for the reports landing page. */
const overview = catchAsync(async (req, res) => {
  const [fines, clearance, groups, stock, trend] = await Promise.all([
    fineService.summary(req.query),
    clearanceService.statistics(),
    groupService.statistics(req.query),
    inventoryService.stockSummary(),
    dashboardService.circulationTrend(6),
  ]);
  return ok(res, {
    message: 'Reporting overview',
    data: { fines, clearance, readingGroups: groups, stock, circulationTrend: trend },
  });
});

module.exports = { list, run, overview };
