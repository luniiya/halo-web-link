import fs from 'node:fs/promises';
import { createClient } from '../helpers/client.js';
import { getSharedEnv } from './sharedEnv.js';

describe('Upload', () => {
  let serverUrl;
  let testSiteUrl;
  let uploadFixture;
  let outsideUploadFixture;

  beforeAll(() => {
    const env = getSharedEnv();
    serverUrl = env.serverUrl;
    testSiteUrl = env.testSiteUrl;
    uploadFixture = env.uploadFixture;
    outsideUploadFixture = env.outsideUploadFixture;
  });

  test('POST /tabs/:tabId/upload attaches an in-root file to an existing input', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/upload`);
      const result = await client.upload(tabId, { path: uploadFixture });

      expect(result).toMatchObject({
        ok: true,
        via: 'direct_input',
        attached: [await fs.realpath(uploadFixture)],
      });

      const selected = await client.evaluate(tabId, "document.getElementById('selected').textContent");
      expect(selected).toMatchObject({ ok: true, result: 'upload.txt' });
    } finally {
      await client.cleanup();
    }
  });

  test('base64 source attaches to the input that belongs to the clicked button', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/upload-form`);
      const result = await client.upload(tabId, {
        selector: '#letterZone button',
        base64: Buffer.from('hello letter').toString('base64'),
        filename: 'letter.txt',
        mimeType: 'text/plain',
      });

      expect(result).toMatchObject({
        ok: true,
        via: 'target_input',
        attached: ['letter.txt'],
        files: [{ name: 'letter.txt', size: 12, mimeType: 'text/plain' }],
      });
      const names = await client.evaluate(tabId, "document.getElementById('cvName').textContent + '|' + document.getElementById('letterName').textContent");
      expect(names).toMatchObject({ ok: true, result: '|letter.txt:12' });
    } finally {
      await client.cleanup();
    }
  });

  test('url source is fetched server side', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/upload-form`);
      const result = await client.upload(tabId, { selector: '#cv', url: `${testSiteUrl}/inline-document.pdf` });

      expect(result).toMatchObject({
        ok: true,
        via: 'target_input',
        files: [{ name: 'inline-document.pdf', mimeType: 'application/pdf' }],
      });
      const name = await client.evaluate(tabId, "document.getElementById('cvName').textContent");
      expect(name.result).toMatch(/^inline-document\.pdf:\d+$/);
    } finally {
      await client.cleanup();
    }
  });

  test('drop mode drag-and-drops onto a zone with no file input', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/upload-form`);
      const result = await client.upload(tabId, {
        selector: '#dropOnly',
        mode: 'drop',
        base64: Buffer.from('dropped!').toString('base64'),
        filename: 'd.txt',
        mimeType: 'text/plain',
      });

      expect(result).toMatchObject({ ok: true, via: 'drop' });
      const dropped = await client.evaluate(tabId, "document.getElementById('dropped').textContent");
      expect(dropped).toMatchObject({ ok: true, result: 'd.txt:text/plain:dropped!' });
    } finally {
      await client.cleanup();
    }
  });

  test('rejects more than one file source', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/upload`);
      await expect(client.upload(tabId, { url: `${testSiteUrl}/inline-document.pdf`, base64: 'aGk=', filename: 'a.txt' }))
        .rejects.toMatchObject({ status: 400, data: { code: 'invalid_upload_source' } });
    } finally {
      await client.cleanup();
    }
  });

  test('POST /tabs/:tabId/upload rejects a path outside the upload root', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/upload`);

      await expect(client.upload(tabId, { path: outsideUploadFixture }))
        .rejects.toMatchObject({ status: 400, data: { code: 'upload_path_outside_root' } });
    } finally {
      await client.cleanup();
    }
  });
});
