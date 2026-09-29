
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuration-based service discovery
const getServiceRegistry = () => ({
  'user-service':
    process.env.USER_SERVICE_URL || 'http://localhost:3001',

  'product-service':
    process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',

  'order-service':
    process.env.ORDER_SERVICE_URL || 'http://localhost:3003'
});

// Gateway health check
app.get('/health', (req, res) => {
  const registry = getServiceRegistry();

  res.status(200).json({
    status: 'UP',
    service: 'api-gateway',
    port: PORT,
    timestamp: new Date().toISOString(),
    routes: {
      '/users': registry['user-service'],
      '/products': registry['product-service'],
      '/orders': registry['order-service']
    }
  });
});

// Generic reverse proxy
const proxyToService = (serviceName) => {
  return async (req, res) => {
    const startTime = Date.now();

    const registry = getServiceRegistry();
    const targetBaseUrl = registry[serviceName];

    if (!targetBaseUrl) {
      console.error(
        `[API Gateway] Missing configuration for ${serviceName}`
      );

      return res.status(500).json({
        error: 'Gateway Configuration Error',
        message: `Service '${serviceName}' is not configured.`
      });
    }

    // Remove trailing slashes to avoid double slashes
    const baseUrl = targetBaseUrl.replace(/\/+$/, '');

    // Preserve the original route and query parameters
    const targetUrl = `${baseUrl}${req.originalUrl}`;

    try {
      // Copy incoming headers
      const headers = { ...req.headers };

      // Remove headers that must be generated for
      // the new upstream HTTP request
      delete headers.host;
      delete headers['content-length'];
      delete headers['transfer-encoding'];
      delete headers.connection;

      // Only forward request bodies for methods that use them
      const hasBody = ['POST', 'PUT', 'PATCH'].includes(
        req.method.toUpperCase()
      );

      // Avoid unnecessary Content-Type on GET requests
      if (!hasBody) {
        delete headers['content-type'];
      }

      console.log(
        `[API Gateway] Forwarding ${req.method} ` +
        `${req.originalUrl} -> ${targetUrl}`
      );

      const response = await axios({
        method: req.method,
        url: targetUrl,
        headers,
        data: hasBody ? req.body : undefined,

        // Allow sleeping Render services time to start
        timeout: 60000,

        // Return upstream HTTP responses instead of
        // automatically throwing for 4xx/5xx statuses
        validateStatus: () => true
      });

      const duration = Date.now() - startTime;

      console.log(
        `[API Gateway Log] ${req.method} ${req.originalUrl} ` +
        `-> ${serviceName} (${targetUrl}) | ` +
        `Status: ${response.status} | Time: ${duration}ms`
      );

      // Log the actual upstream response when it fails
      if (response.status >= 400) {
        console.error('[Gateway Upstream Error]', {
          service: serviceName,
          targetUrl,
          status: response.status,
          contentType: response.headers['content-type'],
          responseBody: response.data
        });
      }

      // Forward the upstream response content type
      if (response.headers['content-type']) {
        res.setHeader(
          'content-type',
          response.headers['content-type']
        );
      }

      return res.status(response.status).send(response.data);

    } catch (err) {
      const duration = Date.now() - startTime;

      console.error('[Gateway Connection Error]', {
        method: req.method,
        route: req.originalUrl,
        service: serviceName,
        targetUrl,
        duration: `${duration}ms`,
        message: err.message,
        code: err.code,
        status: err.response?.status,
        responseBody: err.response?.data
      });

      // Distinguish timeout from other connection failures
      const isTimeout =
        err.code === 'ECONNABORTED' ||
        err.code === 'ETIMEDOUT';

      return res.status(isTimeout ? 504 : 502).json({
        error: isTimeout ? 'Gateway Timeout' : 'Bad Gateway',
        message: isTimeout
          ? `Service '${serviceName}' did not respond in time.`
          : `Unable to communicate with '${serviceName}'.`,
        service: serviceName,
        statusCode: isTimeout ? 504 : 502,
        details: err.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Route mapping
app.use('/users', proxyToService('user-service'));

app.use('/products', proxyToService('product-service'));

app.use('/orders', proxyToService('order-service'));

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message:
      `No route handler found for '${req.originalUrl}'. ` +
      'Available routes: /users, /products, /orders, /health'
  });
});

// Start API Gateway
app.listen(PORT, '0.0.0.0', () => {
  const registry = getServiceRegistry();

  console.log('==========================================');
  console.log(`[API Gateway] Running on port ${PORT}`);
  console.log('[API Gateway] Service Registry:');
  console.log(`User: ${registry['user-service']}`);
  console.log(`Product: ${registry['product-service']}`);
  console.log(`Order: ${registry['order-service']}`);
  console.log('==========================================');
});