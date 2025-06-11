import { performance } from 'perf_hooks';

// Generate fake Puskesmas data for testing
export const generatePuskesmasData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `puskesmas-${index + 1}`,
    name: `Puskesmas ${index + 1}`,
    location: {
      lat: -6.2 + (Math.random() * 0.1),
      lng: 106.8 + (Math.random() * 0.1)
    },
    address: `Jl. Kesehatan No. ${index + 1}`,
    phone: `021-${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
    medicines: Math.floor(Math.random() * 100) + 50,
    status: Math.random() > 0.5 ? 'active' : 'inactive',
    lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));
};

// Performance measurement helper
export const measurePerformance = async <T>(
  fn: () => Promise<T> | T,
  testName: string
): Promise<{ result: T; duration: number }> => {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  
  const duration = endTime - startTime;
  console.log(`⏱️ ${testName}: ${duration.toFixed(2)}ms`);
  
  return { result, duration };
};

// Performance thresholds for 500+ Puskesmas
export const PERFORMANCE_THRESHOLDS = {
  RENDER_TIME_MS: 5000,      // 5 seconds max
  INTERACTION_TIME_MS: 500,   // 500ms max  
  DATA_PROCESSING_MS: 3000   // 3 seconds max
};