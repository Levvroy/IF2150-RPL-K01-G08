import test from 'node:test';
import assert from 'node:assert/strict';
import { cekAmbangRisiko, prosesBalasanSTOP } from '../controllers/PeringatanSMSController.js';

test('C18-UT05 daftar petak kosong selesai tanpa error', async () => {
  await assert.doesNotReject(() => cekAmbangRisiko([]));
});

test('C18-UT10 balasan selain STOP tidak memproses apa pun (FALSE)', async () => {
  assert.equal(await prosesBalasanSTOP('081200000001', 'BERHENTI'), false);
  assert.equal(await prosesBalasanSTOP('081200000001', 'STOPP'), false);
  assert.equal(await prosesBalasanSTOP('081200000001', ''), false);
});

test('C18-UT10b balasan bukan string ditolak (FALSE)', async () => {
  assert.equal(await prosesBalasanSTOP('081200000001', null), false);
  assert.equal(await prosesBalasanSTOP('081200000001', undefined), false);
  assert.equal(await prosesBalasanSTOP('081200000001', 123), false);
});