import * as Sentry from "@sentry/node";
import express from "express";

export function registerSentryTestRoutes(app: express.Application) {
  // Test route for Sentry metrics
  app.get("/api/sentry-test", (req, res) => {
    try {
      // Test metrics using the proper API
      Sentry.metrics.count('button_click', 1);
      Sentry.metrics.gauge('page_load_time', 150);
      Sentry.metrics.distribution('response_time', 200);
      
      // Additional test metrics
      Sentry.metrics.count('user_visits', 1);
      Sentry.metrics.gauge('api_response_time', 100);
      
      res.json({
        message: "Sentry metrics test completed successfully!",
        metrics: [
          "button_click count: 1",
          "page_load_time gauge: 150",
          "response_time distribution: 200",
          "user_visits count: 1",
          "api_response_time gauge: 100"
        ],
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Sentry.captureException(error);
      res.status(500).json({ error: "Sentry metrics test failed" });
    }
  });
  
  // Test error capture
  app.get("/api/sentry-error", (req, res) => {
    try {
      // Create a test error
      const error = new Error("Test error from API endpoint");
      error.stack = (error.stack || '') + "\nAPI Error Context:\n- Endpoint: /api/sentry-error\n- Method: GET\n- Timestamp: " + new Date().toISOString();
      
      // Capture the error with additional context
      Sentry.captureException(error, {
        tags: {
          component: 'api',
          endpoint: '/api/sentry-error'
        },
        extra: {
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          query: req.query
        }
      });
      
      res.json({
        message: "Test error sent to Sentry!",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Sentry.captureException(error);
      res.status(500).json({ error: "Failed to send test error" });
    }
  });
  
  // Test performance monitoring
  app.get("/api/sentry-performance", (req, res) => {
    // Simple performance test
    const startTime = Date.now();
    
    // Simulate some work
    setTimeout(() => {
      const duration = Date.now() - startTime;
      Sentry.captureMessage(`Performance test completed in ${duration}ms`, 'info');
      
      res.json({
        message: "Performance test completed!",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
    }, 200);
  });
}
