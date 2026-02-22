import { vi } from 'vitest';

function createModelMock() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  };
}

export const mockPrisma = {
  employee: createModelMock(),
  attendance: createModelMock(),
  locationRecord: createModelMock(),
  spoofingAlert: createModelMock(),
  geofence: createModelMock(),
  employeeGeofence: createModelMock(),
  auditLog: createModelMock(),
};

export function resetAllMocks() {
  for (const model of Object.values(mockPrisma)) {
    for (const fn of Object.values(model)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
}
