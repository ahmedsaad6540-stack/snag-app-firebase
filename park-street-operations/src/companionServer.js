'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createMemoryRepo } = require('./repository');
const { memoryOperationsRepo } = require('./operationsRepo');
const { buildMasterOperationsWorkbook, buildOperationsSummaryCsv } = require('./reportExporter');
const { runFullAnalysis } = require('./ai/engine');
const { homeView } = require('./views');
const { moduleHome, directoryView } = require('./operationsViews');

function createCompanionServer({
  teamId = process.env.SLACK_ALLOWED_TEAM_ID || 'T000000DEMO',
  userId = (process.env.SLACK_ALLOWED_USER_IDS || 'U000000DEMO').split(',')[0].trim(),
  repo = createMemoryRepo({ persistPath: path.join(process.cwd(), '.staging-data', 'tickets.json') }),
  moduleRepo = memoryOperationsRepo({ persistPath: path.join(process.cwd(), '.staging-data', 'operations.json') })
} = {}) {
  const gatherContext = async () => {
    const tickets = await repo.list(teamId);
    const parkRecords = await moduleRepo.list(teamId, 'park', 100);
    const restroomRecords = await moduleRepo.list(teamId, 'restroom', 1500);
    const restroomMeta = await moduleRepo.listRestroomMeta(teamId);
    const units = await moduleRepo.list(teamId, 'unit', 200);
    const stores = await moduleRepo.list(teamId, 'store', 200);
    const permits = await moduleRepo.list(teamId, 'permit', 100);
    const customItems = await moduleRepo.list(teamId, 'custom', 100);
    const notifications = await moduleRepo.listNotifications(teamId, 50);
    const parkMap = Object.fromEntries(parkRecords.map((r) => [r.id || r.key, r]));
    const ai = runFullAnalysis({
      snags: tickets,
      parkInspection: { items: parkMap },
      restroomInspections: restroomMeta
    });
    return {
      teamId,
      userId,
      tickets,
      parkRecords,
      restroomRecords,
      restroomMeta,
      units,
      stores,
      permits,
      customItems,
      notifications,
      ai
    };
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');

      if (req.method === 'GET' && url.pathname === '/api/state') {
        const state = await gatherContext();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(state));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/slack-home') {
        const viewType = url.searchParams.get('view') || 'overview';
        const ctx = await gatherContext();
        let viewPayload;
        if (viewType === 'directory') {
          viewPayload = directoryView();
        } else if (viewType === 'overview' || viewType === 'orders') {
          viewPayload = homeView(ctx.tickets, userId);
        } else {
          const rows = ['reports', 'team', 'ai'].includes(viewType)
            ? []
            : viewType === 'notifications'
              ? ctx.notifications
              : await moduleRepo.list(teamId, viewType, 100);
          viewPayload = moduleHome(viewType, rows, {
            ...ctx,
            config: { team: teamId, users: new Set([userId]) }
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(viewPayload));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/export.xlsx') {
        const ctx = await gatherContext();
        const buffer = await buildMasterOperationsWorkbook(ctx);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="Park_Street_Operations_Staging.xlsx"'
        });
        res.end(Buffer.from(buffer));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/export.csv') {
        const ctx = await gatherContext();
        const csv = buildOperationsSummaryCsv(ctx);
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="Park_Street_Operations_Summary.csv"'
        });
        res.end(csv);
        return;
      }

      // Default: serve the generated interactive preview HTML
      const previewFile = path.join(__dirname, '..', 'preview', 'Park_Street_Operations_Interactive_Demo.html');
      if (fs.existsSync(previewFile)) {
        const html = fs.readFileSync(previewFile, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  return { server, gatherContext, repo, moduleRepo };
}

if (require.main === module) {
  const port = Number(process.env.COMPANION_PORT || 4090);
  const { server } = createCompanionServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`Park Street Operations Companion Server running at http://127.0.0.1:${port}`);
    console.log(`- Interactive Web UI: http://127.0.0.1:${port}/`);
    console.log(`- Master Excel Export (.xlsx): http://127.0.0.1:${port}/api/export.xlsx`);
    console.log(`- Summary CSV Export (.csv): http://127.0.0.1:${port}/api/export.csv`);
    console.log(`- Slack App Home Block Kit JSON: http://127.0.0.1:${port}/api/slack-home?view=overview`);
  });
}

module.exports = { createCompanionServer };
