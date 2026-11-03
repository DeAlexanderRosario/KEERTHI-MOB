import { test, describe } from 'node:test';
import assert from 'node:assert';
import { vmsService } from '../services/vmsService';

describe('Field Sales - Geofencing & Haversine Distance', () => {
  test('calculates accurate distance between coordinates using Haversine formula', () => {
    // Distance between Kochi Marine Drive (9.9816, 76.2750) and MG Road Kochi (9.9723, 76.2825) ~1.3km
    const distanceMeters = vmsService.calculateDistanceMeters(9.9816, 76.2750, 9.9723, 76.2825);
    assert.ok(distanceMeters > 1200 && distanceMeters < 1500, `Expected ~1300m, got ${distanceMeters}m`);
  });

  test('detects visit strictly within 200m geofence radius', () => {
    // 50 meters offset
    const shopLat = 9.9816;
    const shopLon = 76.2750;
    // ~55 meters away
    const agentLat = 9.9821;
    const agentLon = 76.2750;

    const evaluation = vmsService.verifyGeofence(agentLat, agentLon, shopLat, shopLon, 200);
    assert.strictEqual(evaluation.isWithinGeofence, true);
    assert.strictEqual(evaluation.status, 'Verified On-Site');
    assert.ok(evaluation.distanceMeters < 100);
  });

  test('flags visit outside 200m geofence radius as exception', () => {
    const shopLat = 9.9816;
    const shopLon = 76.2750;
    // ~800 meters away
    const agentLat = 9.9890;
    const agentLon = 76.2750;

    const evaluation = vmsService.verifyGeofence(agentLat, agentLon, shopLat, shopLon, 200);
    assert.strictEqual(evaluation.isWithinGeofence, false);
    assert.strictEqual(evaluation.status, 'Outside Geofence');
    assert.ok(evaluation.distanceMeters > 700);
  });
});
