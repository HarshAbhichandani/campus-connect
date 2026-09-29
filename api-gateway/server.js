require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuration-Based Service Registry (Service Discovery Layer)
// Reads service locations from environment variables at startup / runtime
const getServiceRegistry = () => ({
  'user-service': process.env.USER_SERVICE_URL || 'http://localhost:3001',
  'product-service': process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  'order-service': process.env.ORDER_SERVICE_URL || 'http://localhost:3003'
});

// Gateway Health Check Endpoint
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

// Generic Reverse Proxy Handler with Request Logging and Centralized 502/503 Error Handling
const proxyToService = (serviceName) => {
  return async (req, res) => {
    const startTime = Date.now();
    const registry = getServiceRegistry();
    const targetBaseUrl = registry[serviceName];

    if (!targetBaseUrl) {
      console.error(`[API Gateway] Error: No configuration found for service '${serviceName}'`);
      return res.status(500).json({
        error: 'Gateway Configuration Error',
        message: `Service '${serviceName}' location is not defined in gateway configuration.`
      });
    }

    const targetUrl = `${targetBaseUrl}${req.originalUrl}`;

    
try {
  const headers = { ...req.headers };

  delete headers.host;
  delete headers["content-length"];
  delete headers["transfer-encoding"];

  const response = await axios({
    method: req.method,
    url: targetUrl,
    data: ["POST", "PUT", "PATCH"].includes(req.method)
      ? req.body
      : undefined,
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    validateStatus: () => true,
    timeout: 10000
  });

      const duration = Date.now() - startTime;
      console.log(`[API Gateway Log] ${req.method} ${req.originalUrl} -> ${serviceName} (${targetUrl}) | Status: ${response.status} | Time: ${duration}ms`);

      if (response.headers['content-type']) {
        res.setHeader('content-type', response.headers['content-type']);
      }

      return res.status(response.status).send(response.data);
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[API Gateway Log] ${req.method} ${req.originalUrl} -> ${serviceName} UNREACHABLE | Time: ${duration}ms | Error: ${err.message}`);

      return res.status(502).json({
        error: 'Bad Gateway',
        message: `Target service '${serviceName}' at '${targetBaseUrl}' is unreachable or refused connection.`,
        service: serviceName,
        targetUrl: targetUrl,
        statusCode: 502,
        details: err.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Route Mapping (Configured via Service Registry)
app.use('/users', proxyToService('user-service'));
app.use('/products', proxyToService('product-service'));
app.use('/orders', proxyToService('order-service'));

// Fallback route for unknown paths
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `No route handler found on API Gateway for path '${req.originalUrl}'. Available routes: /users, /products, /orders, /health`
  });
});

app.listen(PORT, '0.0.0.0', () => {
  const registry = getServiceRegistry();
  console.log(`=======================================================`);
  console.log(`[API Gateway] Running on port ${PORT}`);
  console.log(`[API Gateway] Configured Service Registry:`);
  console.log(`   - User Service   (/users)    -> ${registry['user-service']}`);
  console.log(`   - Product Service (/products) -> ${registry['product-service']}`);
  console.log(`   - Order Service   (/orders)   -> ${registry['order-service']}`);
  console.log(`=======================================================`);
});
