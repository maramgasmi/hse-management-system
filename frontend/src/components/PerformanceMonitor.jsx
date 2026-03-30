// frontend/src/components/PerformanceMonitor.jsx

import { useEffect } from 'react';

const PerformanceMonitor = ({ pageName }) => {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') return;

    // Measure page load time
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      console.log(`[Performance] ${pageName} load time:`, perfData.loadEventEnd - perfData.fetchStart, 'ms');
    }

    // Measure time to interactive
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`[Performance] ${pageName} ${entry.name}:`, entry.duration, 'ms');
        }
      });
      observer.observe({ entryTypes: ['measure'] });
    }
  }, [pageName]);

  return null;
};

export default PerformanceMonitor;