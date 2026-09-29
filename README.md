# LAB 7 ASSIGNMENT: API Gateway, Service Discovery & Cloud Deployment

**Course:** Web Services & SOA Laboratory  
**Lab Number:** Lab 7  
**Topic:** API Gateway Implementation, Configuration-Based Service Discovery, Centralized Error Handling & Resilience (502/503), Docker Network Security Isolation, and Cloud Deployment  

---

## 1. Project Overview & Evolution from Lab 6

In **Lab 6**, the monolithic backend was decomposed into three independently runnable microservices (`user-service`, `product-service`, and `order-service`) communicating over a shared Docker bridge network (`campus-network`). However, clients still had to call each service directly via separate exposed host ports (`:3001`, `:3002`, `:3003`).

In **Lab 7**, we complete the microservices architecture by introducing a real **API Gateway** (`api-gateway`) as the single, centralized public entry point for all client requests.

### Key Enhancements Introduced in Lab 7:
1. **API Gateway (`api-gateway`)**: Built using Express, running on port `:3000`. It performs reverse proxy routing for `/users/*`, `/products/*`, and `/orders/*`.
2. **Network Security Isolation**: Published host ports (`3001`, `3002`, `3003`) have been removed from `user-service`, `product-service`, and `order-service` in `compose.yaml`. Only the API Gateway (`3000:3000`) is exposed externally. Backend services are reachable strictly from inside `campus-network`.
3. **Configuration-Based Service Discovery**: Service locations are externalized into environment variables (`USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL`). The gateway reads this configuration dynamically at runtime to construct routing tables.
4. **Centralized Logging & Resilience**: Integrated request logging at the gateway level (HTTP method, original URL, target service, status code, latency) and centralized error handling returning standardized `502 Bad Gateway` JSON responses when backend services are offline.
5. **Cloud Deployment Readiness**: Configured containerized deployment workflow for cloud platforms (e.g., Render, Railway, Fly.io) with cloud-hosted MongoDB Atlas.

---

## 2. Full-Stack Architecture & Security Isolation

### Architecture Diagram

```mermaid
graph TD
    Client["Client / Postman / Browser<br/>(Public Internet)"]

    subgraph Cloud / Docker Host
        GW["API Gateway<br/>(api-gateway:3000)<br/>Public Port: 3000"]
        
        subgraph Docker Network: campus-network (Internal Network Only)
            US["User Service<br/>(user-service:3001)"]
            PS["Product Service<br/>(product-service:3002)"]
            OS["Order Service<br/>(order-service:3003)"]
        end

        Atlas[("MongoDB Atlas / Storage<br/>(Cloud Hosted / Container)")]
    end

    Client -->|1. Single Entry Point: HTTP GET/POST/PUT/DELETE| GW

    GW -->|Route /users/*| US
    GW -->|Route /products/*| PS
    GW -->|Route /orders/*| OS
    GW -->|Health Check /health| GW

    OS -->|Inter-Service Call: GET /users/{id}| US
    OS -->|Inter-Service Call: GET /products/{id}| PS

    US --- Atlas
    PS --- Atlas
    OS --- Atlas
```

---

## 3. Gateway Routing & Endpoints Reference

| Gateway Endpoint | HTTP Method | Routed Backend Service | Target Internal URL | Example Call | Expected Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | API Gateway itself | N/A (Local response) | `GET http://localhost:3000/health` | `200 OK` |
| `/users` | `GET` | User Service | `http://user-service:3001/users` | `GET http://localhost:3000/users` | `200 OK` |
| `/users/:id` | `GET` | User Service | `http://user-service:3001/users/101` | `GET http://localhost:3000/users/101` | `200 OK` / `404` |
| `/users` | `POST` | User Service | `http://user-service:3001/users` | `POST http://localhost:3000/users` | `201 Created` |
| `/users/:id` | `PUT` | User Service | `http://user-service:3001/users/101` | `PUT http://localhost:3000/users/101` | `200 OK` / `404` |
| `/users/:id` | `DELETE` | User Service | `http://user-service:3001/users/103` | `DELETE http://localhost:3000/users/103` | `200 OK` / `404` |
| `/products` | `GET` | Product Service | `http://product-service:3002/products` | `GET http://localhost:3000/products` | `200 OK` |
| `/products/:id` | `GET` | Product Service | `http://product-service:3002/products/501` | `GET http://localhost:3000/products/501` | `200 OK` / `404` |
| `/products` | `POST` | Product Service | `http://product-service:3002/products` | `POST http://localhost:3000/products` | `201 Created` |
| `/products/:id` | `PUT` | Product Service | `http://product-service:3002/products/501` | `PUT http://localhost:3000/products/501` | `200 OK` / `404` |
| `/products/:id` | `DELETE` | Product Service | `http://product-service:3002/products/503` | `DELETE http://localhost:3000/products/503` | `200 OK` / `404` |
| `/orders` | `GET` | Order Service | `http://order-service:3003/orders` | `GET http://localhost:3000/orders` | `200 OK` |
| `/orders/:id` | `GET` | Order Service | `http://order-service:3003/orders/901` | `GET http://localhost:3000/orders/901` | `200 OK` / `404` |
| `/orders` | `POST` | Order Service | `http://order-service:3003/orders` | `POST http://localhost:3000/orders` | `201 Created` / `404` / `503` |

---

## 4. Part A - Discussion Question Answer

> **Question:** Why introduce an API Gateway instead of letting clients call each service directly? Think about a single entry point, hiding internal structure, and centralizing concerns like logging and error handling.

### Answer:
Introducing an API Gateway provides several fundamental architectural advantages over direct client-to-service communication:

1. **Single Entry Point & Simplified Client Interface**: Clients only need to know one public host/domain (e.g., `http://localhost:3000` or `https://campusconnect-gateway.onrender.com`). They do not need to manage a list of dozens of microservice hostnames and ports.
2. **Hiding Internal Topology & Network Security**: Internal microservice addresses (`http://user-service:3001`, `http://product-service:3002`) remain completely private within the Docker network boundary (`campus-network`). By removing direct external port exposure from individual services, malicious external actors cannot directly scan or exploit internal microservice endpoints.
3. **Centralization of Cross-Cutting Concerns**: Security policies (CORS, JWT authentication, rate limiting), request logging, SSL termination, and standardized error handling are implemented once at the Gateway, rather than duplicated across every microservice.
4. **Resilience & Graceful Degradation**: If an internal service becomes unreachable or crashes, the API Gateway catches the connection failure and returns a clean `502 Bad Gateway` or `503 Service Unavailable` error, preventing client applications from hanging indefinitely or encountering unhandled CORS/connection errors.
5. **Refactoring Flexibility**: Backend microservices can be split, merged, migrated, or re-written in different programming languages without breaking external client contracts, because the Gateway abstracts the underlying route targets.

---

## 5. Part B - Configuration-Based Service Discovery & Discussion

### Configuration-Based Service Registry
In `api-gateway/server.js`, service locations are externalized into environment variables instead of being hard-coded into route handlers:

```javascript
// Configuration-Based Service Registry
const getServiceRegistry = () => ({
  'user-service': process.env.USER_SERVICE_URL || 'http://localhost:3001',
  'product-service': process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  'order-service': process.env.ORDER_SERVICE_URL || 'http://localhost:3003'
});
```

### Proving Configuration-Driven Routing (No Code Change Required)
To change where the gateway routes requests for `user-service`, simply update the environment variable in `compose.yaml` or `.env`:

```yaml
environment:
  USER_SERVICE_URL: http://user-service-v2:3005
```

When `docker compose up -d` is run with the updated environment variable, `api-gateway` reads the new location dynamically on startup without changing a single line of JavaScript source code.

---

### Part B - Discussion Question Answer

> **Question:** Briefly contrast this static/config-based approach with dynamic service discovery (e.g. Consul, Eureka, Kubernetes DNS) - what would a dynamic registry add that a static config file cannot?

### Answer:
* **Static / Configuration-Based Service Discovery**:
  * **How it works**: Service locations are defined in environment variables or configuration files (`compose.yaml`, `.env`). The gateway reads these fixed values at startup.
  * **Limitations**: If a microservice scales to multiple container instances, moves to a new IP address dynamically, or crashes, the static config file must be manually updated and the gateway restarted.

* **Dynamic Service Discovery (e.g., Consul, Eureka, HashiCorp Consul, Kubernetes DNS)**:
  * **How it works**: Microservices automatically register themselves with a central Service Registry daemon upon startup (heartbeat / self-registration). The registry continuously performs active health checks on every registered instance.
  * **What Dynamic Service Discovery Adds**:
    1. **Auto-Registration & Deregistration**: Instances automatically announce their presence when launched and are removed from the routing table immediately if they crash or fail health checks.
    2. **Client-Side & Server-Side Load Balancing**: Distributes incoming traffic across multiple running instances of the same service (e.g., round-robin across 5 instances of `user-service`).
    3. **Zero-Downtime Dynamic Scaling**: Allows auto-scaling microservices up or down from 1 to 50 instances during traffic spikes without restarting or reconfiguring the API Gateway.
    4. **Active Health Monitoring**: Automatically reroutes traffic away from unhealthy container instances before clients experience failures.

---

## 6. Part C - Cloud Deployment Guide

The containerized microservices application and API Gateway can be deployed to free-tier cloud container platforms such as **Render**, **Railway**, or **Fly.io**, backed by **MongoDB Atlas**.

### Cloud Architecture & Deployment Steps (Render Example)

1. **MongoDB Atlas Database**:
   - Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Obtain connection string: `mongodb+srv://admin:<password>@campusconnect.mongodb.net/user_db?retryWrites=true&w=majority`.

2. **Deploying Backend Services on Cloud Platform**:
   - Create a Web Service for `user-service` from Git repo (Docker runtime). Set `PORT=3001` and `MONGODB_URI`.
   - Create a Web Service for `product-service` (Docker runtime). Set `PORT=3002` and `MONGODB_URI`.
   - Create a Web Service for `order-service` (Docker runtime). Set `PORT=3003`, `USER_SERVICE_URL=https://user-service.onrender.com`, `PRODUCT_SERVICE_URL=https://product-service.onrender.com`, and `MONGODB_URI`.

3. **Deploying API Gateway**:
   - Create a Web Service for `api-gateway` (Docker runtime). Set `PORT=3000`.
   - Configure Environment Variables:
     * `USER_SERVICE_URL=https://user-service.onrender.com`
     * `PRODUCT_SERVICE_URL=https://product-service.onrender.com`
     * `ORDER_SERVICE_URL=https://order-service.onrender.com`
   - Render exposes the API Gateway at a public HTTPS URL: `https://campusconnect-gateway.onrender.com`.

4. **Verification via Cloud URL**:
   - Postman requests can target `https://campusconnect-gateway.onrender.com/health`, `/users`, `/products`, and `/orders` directly over the public internet.

---

## 7. How to Run locally via Docker Compose

### Step 1: Clone & Navigate to Project Directory
```bash
cd "c:\mscit_sem_3\web service and soa\lab_6\lab_6\lab_6"
```

### Step 2: Build & Launch Containerized Infrastructure
```bash
# Validate Compose configuration
docker compose config

# Build container images and start all services in detached mode
docker compose up -d --build
```

### Step 3: Verify Running Services & Network Isolation
```bash
docker compose ps
```
*Expected Output:*
- `api-gateway`: Running, exposed on host port `3000:3000`.
- `user-service`, `product-service`, `order-service`: Running, internal network only.
- `user-db`, `product-db`, `order-db`: Running.

### Step 4: Inspect Gateway Logs
```bash
# Stream API Gateway request logs
docker compose logs -f api-gateway
```

### Step 5: Test Gateway Unreachable Service Resilience (502 Bad Gateway)
```bash
# Stop user-service container to simulate service crash
docker compose stop user-service

# Request /users via API Gateway
curl -i http://localhost:3000/users
```
*Expected Response (`HTTP/1.1 502 Bad Gateway`):*
```json
{
  "error": "Bad Gateway",
  "message": "Target service 'user-service' at 'http://user-service:3001' is unreachable or refused connection.",
  "service": "user-service",
  "targetUrl": "http://user-service:3001/users",
  "statusCode": 502,
  "details": "connect ECONNREFUSED 172.20.0.3:3001",
  "timestamp": "2026-09-28T17:30:00.000Z"
}
```

### Step 6: Restart Service & Confirm Recovery
```bash
docker compose start user-service
curl http://localhost:3000/users
```

---

## 8. Postman Test Evidence & Summary

The provided Postman collection `Microservices - Lab 7.postman_collection.json` verifies all local and cloud routes:

| Test Group | Request Name | Method | URL / Path | Expected Status | Validation Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **API Gateway Core** | GET Gateway Health | `GET` | `http://localhost:3000/health` | `200 OK` | Returns gateway status UP & service map |
| | Unreachable 502 Test | `GET` | `http://localhost:3000/users` | `502 Bad Gateway` | Verifies graceful 502 error when target is down |
| **User Service** | GET All Users | `GET` | `http://localhost:3000/users` | `200 OK` | Returns user array via Gateway |
| | GET User by ID | `GET` | `http://localhost:3000/users/101` | `200 OK` | Returns John Doe object |
| | POST Create User | `POST` | `http://localhost:3000/users` | `201 Created` | Creates Alice Johnson |
| | PUT Update User | `PUT` | `http://localhost:3000/users/101` | `200 OK` | Updates Johnathan Doe |
| | DELETE User | `DELETE` | `http://localhost:3000/users/103` | `200 OK` | Deletes user 103 |
| **Product Service** | GET All Products | `GET` | `http://localhost:3000/products` | `200 OK` | Returns product array via Gateway |
| | GET Product by ID | `GET` | `http://localhost:3000/products/501` | `200 OK` | Returns Campus Hoodie |
| | POST Create Product | `POST` | `http://localhost:3000/products` | `201 Created` | Creates Wireless Mouse |
| | PUT Update Product | `PUT` | `http://localhost:3000/products/501` | `200 OK` | Updates product price |
| | DELETE Product | `DELETE` | `http://localhost:3000/products/503` | `200 OK` | Deletes product 503 |
| **Order Service** | GET All Orders | `GET` | `http://localhost:3000/orders` | `200 OK` | Returns orders list via Gateway |
| | POST Create Order | `POST` | `http://localhost:3000/orders` | `201 Created` | Inter-service validation via Gateway |
| | POST Order (Invalid User)| `POST` | `http://localhost:3000/orders` | `404 Not Found` | Handled 404 when user doesn't exist |
| **Cloud Deployment**| GET Cloud Health | `GET` | `https://campusconnect-gateway.onrender.com/health` | `200 OK` | Verifies public cloud gateway status |
| | GET Cloud Users | `GET` | `https://campusconnect-gateway.onrender.com/users` | `200 OK` | Verifies full cloud-to-MongoDB flow |

---

## 9. Troubleshooting & FAQ

1. **Port 3000 / 3001 / 3002 / 3003 Already in Use (`EADDRINUSE`)**:
   - Run `docker compose down` or kill local Node processes listening on those ports.
   - You can override `PORT` or `GATEWAY_PORT` in environment variables if needed.

2. **502 Bad Gateway Returned by API Gateway**:
   - Cause: The backend container (`user-service`, `product-service`, or `order-service`) is not running or failed to connect to MongoDB.
   - Resolution: Check container logs via `docker compose logs user-service` to fix any database connection errors.

3. **CORS Errors when calling from Web Clients**:
   - Both `api-gateway` and backend microservices feature `cors()` middleware enabled to accept cross-origin requests seamlessly.

---

## 10. Written Reflection (Lab 7 Summary)

> **Reflection on System Operation & Architecture Changes (Lab 6 vs. Lab 7):**
> 
> Transforming the system from Lab 6 to Lab 7 fundamentally changed how CampusConnect is accessed, secured, and operated. In Lab 6, clients directly interacted with microservices exposed across multiple host ports, exposing internal infrastructure details and requiring clients to manage scattered URLs. Introducing the API Gateway in Lab 7 established a single, unified entry point that abstracts internal topology and enforces strict Docker network isolation for backend services. Furthermore, externalizing service URLs into environment variables established a clean service discovery mechanism that allows service locations to change without touching application code. Centralizing request logging and 502/503 error handling at the gateway improved system observability and resilience under service failures. Finally, moving the containerized gateway and services to cloud hosting with MongoDB Atlas demonstrated a complete, production-ready microservices architecture reachable securely over the internet.

---

## 11. Final Verification Checklist

- [x] `api-gateway` service created with Express, Node.js, `package.json`, `Dockerfile`, and `.dockerignore`.
- [x] API Gateway routes `/users`, `/products`, `/orders` to respective backend microservices.
- [x] `GET /health` endpoint implemented on API Gateway reporting system status and routing registry.
- [x] Request logging middleware added to API Gateway (logging method, path, target, status code, latency).
- [x] Centralized error handling implemented: returns HTTP `502 Bad Gateway` JSON when a backend service is unreachable.
- [x] `compose.yaml` updated: only API Gateway port `3000:3000` is exposed externally; backend microservices are isolated inside `campus-network`.
- [x] Service discovery locations externalized to environment variables (`USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL`).
- [x] Static vs. Dynamic service discovery documented and contrasted in README.
- [x] Cloud deployment steps, architecture, and environment configuration documented for cloud platforms (Render/Railway/Fly.io).
- [x] Postman collection `Microservices - Lab 7.postman_collection.json` updated with gateway routes, health check, 502 test, and cloud URLs.
- [x] Written reflection (5-8 lines) included in README.
