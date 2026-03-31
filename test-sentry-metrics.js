// Test script to verify Sentry metrics API
import * as Sentry from '@sentry/node';

// Initialize Sentry with your DSN
Sentry.init({
  dsn: "https://2cac7de2820ac50245300310975b777c@o4511137391771648.ingest.de.sentry.io/4511137395245136",
  environment: "test",
  _experiments: {
    metricsAggregator: true,
  },
});

console.log('Testing Sentry metrics API...');

try {
  // Test the exact metrics from your example
  Sentry.metrics.count('button_click', 1);
  Sentry.metrics.gauge('page_load_time', 150);
  Sentry.metrics.distribution('response_time', 200);
  
  console.log('✅ Sentry metrics sent successfully!');
  console.log('✅ count(button_click, 1)');
  console.log('✅ gauge(page_load_time, 150)');
  console.log('✅ distribution(response_time, 200)');
  
  // Wait a moment for metrics to be sent
  setTimeout(() => {
    console.log('✅ Metrics should now appear in your Sentry dashboard');
    process.exit(0);
  }, 1000);
  
} catch (error) {
  console.error('❌ Error sending metrics:', error);
  process.exit(1);
}
