import * as Sentry from "@sentry/react";

export default function SentryTest() {
  const handleTestError = () => {
    try {
      throw new Error("Test error for Sentry");
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const handleTestMetrics = () => {
    // Test metrics using the proper API
    Sentry.metrics.count('button_click', 1);
    Sentry.metrics.gauge('page_load_time', Math.random() * 1000);
    Sentry.metrics.distribution('response_time', Math.random() * 500);
    Sentry.metrics.count('user_action', 1);
    
    console.log('Sentry metrics sent!');
  };

  const handleTestPerformance = () => {
    const startTime = Date.now();
    
    // Simulate some work
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.random();
    }
    
    const duration = Date.now() - startTime;
    Sentry.captureMessage(`Performance test completed in ${duration}ms`, 'info');
    
    console.log('Performance test completed:', duration + 'ms');
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Sentry Testing</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-red-50 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">Error Tracking</h3>
          <button
            onClick={handleTestError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Test Error Capture
          </button>
          <p className="text-sm text-gray-600 mt-2">
            This will send a test error to Sentry
          </p>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Metrics</h3>
          <button
            onClick={handleTestMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Test Metrics
          </button>
          <p className="text-sm text-gray-600 mt-2">
            This will send test metrics to Sentry
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Performance</h3>
          <button
            onClick={handleTestPerformance}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Test Performance
          </button>
          <p className="text-sm text-gray-600 mt-2">
            This will send performance data to Sentry
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">DSN Configuration</h3>
        <p className="text-sm text-gray-600">
          Make sure to set VITE_SENTRY_DSN in your environment variables:
        </p>
        <code className="block text-xs bg-gray-100 p-2 rounded mt-2">
          VITE_SENTRY_DSN=https://2cac7de2820ac50245300310975b777c@o4511137391771648.ingest.de.sentry.io/4511137395245136
        </code>
      </div>
    </div>
  );
}
