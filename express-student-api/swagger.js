const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Student Management RESTful API',
      version: '1.0.0',
      description: 'Lab 3 Assignment - Express.js REST API providing complete CRUD operations for Student resources.',
      contact: {
        name: 'Web Services & SOA Laboratory'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development Server'
      }
    ],
    components: {
      schemas: {
        Student: {
          type: 'object',
          required: ['id', 'name', 'email', 'course', 'semester'],
          properties: {
            id: {
              type: 'integer',
              example: 1,
              description: 'Unique auto-incremented student ID'
            },
            name: {
              type: 'string',
              example: 'Aarav Patel',
              description: 'Full name of the student'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'aarav@example.com',
              description: 'Valid email address'
            },
            course: {
              type: 'string',
              example: 'Computer Science',
              description: 'Enrolled course'
            },
            semester: {
              type: 'integer',
              example: 5,
              description: 'Current semester (must be > 0)'
            }
          }
        },
        StudentInput: {
          type: 'object',
          required: ['name', 'email', 'course', 'semester'],
          properties: {
            name: {
              type: 'string',
              example: 'Aarav Patel'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'aarav@example.com'
            },
            course: {
              type: 'string',
              example: 'Computer Science'
            },
            semester: {
              type: 'integer',
              example: 5
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'integer',
              example: 400
            },
            error: {
              type: 'string',
              example: 'Bad Request'
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Email is invalid', 'Semester must be a positive integer']
            }
          }
        }
      }
    }
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = setupSwagger;
