require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Student = require('./models/Student');
const setupSwagger = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_db';

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Connect to MongoDB Atlas / Local MongoDB
let isConnected = false;
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    isConnected = true;
    console.log(`Connected to MongoDB database successfully at: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    // Seed initial data if database is empty
    try {
      const count = await Student.countDocuments();
      if (count === 0) {
        console.log('Seeding initial student records...');
        await Student.insertMany([
          { name: 'Aarav Patel', email: 'aarav@example.com', course: 'Computer Science', semester: 5 },
          { name: 'Priya Sharma', email: 'priya@example.com', course: 'Information Technology', semester: 3 },
          { name: 'Rohan Verma', email: 'rohan@example.com', course: 'Software Engineering', semester: 4 }
        ]);
        console.log('Seed data inserted successfully.');
      }
    } catch (err) {
      console.error('Seed data error:', err.message);
    }
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err.message);
    console.log('Server will continue running. Ensure MongoDB Atlas or local MongoDB service is active.');
  });

// Input Validation Middleware
function validateStudentInput(req, res, next) {
  const { name, email, course, semester } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Field "name" is required and cannot be empty.');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('Field "email" must be a valid email address.');
  }

  if (!course || typeof course !== 'string' || course.trim() === '') {
    errors.push('Field "course" is required and cannot be empty.');
  }

  const parsedSemester = Number(semester);
  if (semester === undefined || semester === null || isNaN(parsedSemester) || !Number.isInteger(parsedSemester) || parsedSemester <= 0) {
    errors.push('Field "semester" must be a positive integer.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Validation failed for request body',
      errors: errors
    });
  }

  next();
}

// Setup Swagger Documentation UI
setupSwagger(app);

/**
 * @openapi
 * /students:
 *   get:
 *     summary: Retrieve a list of all students from MongoDB
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: A list of students retrieved successfully
 *       500:
 *         description: Internal server error
 */
app.get('/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve students from database.'
    });
  }
});

/**
 * @openapi
 * /students/{id}:
 *   get:
 *     summary: Get a student by ID from MongoDB
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The student MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Student details retrieved successfully
 *       400:
 *         description: Invalid student ID format
 *       404:
 *         description: Student not found
 */
app.get('/students/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Invalid student ID parameter. ID must be a valid MongoDB ObjectId.'
    });
  }

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: `Requested student with ID ${id} does not exist.`
      });
    }

    res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student by ID:', error);
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch student details from database.'
    });
  }
});

/**
 * @openapi
 * /students:
 *   post:
 *     summary: Create a new student document in MongoDB
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudentInput'
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Validation failed or duplicate email constraint violation
 */
app.post('/students', validateStudentInput, async (req, res) => {
  const { name, email, course, semester } = req.body;

  try {
    const newStudent = new Student({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      course: course.trim(),
      semester: Number(semester)
    });

    const savedStudent = await newStudent.save();
    res.status(201).json(savedStudent);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'Validation failed for request body',
        errors: [`Email address "${email.trim()}" is already registered. Email must be unique.`]
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'Validation failed for request body',
        errors: messages
      });
    }

    console.error('Error creating student:', error);
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      message: 'Failed to create new student record.'
    });
  }
});

/**
 * @openapi
 * /students/{id}:
 *   put:
 *     summary: Update an existing student document in MongoDB
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The student MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudentInput'
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       400:
 *         description: Invalid input or duplicate email constraint failure
 *       404:
 *         description: Student not found
 */
app.put('/students/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Invalid student ID parameter. ID must be a valid MongoDB ObjectId.'
    });
  }

  validateStudentInput(req, res, async () => {
    const { name, email, course, semester } = req.body;

    try {
      const updatedStudent = await Student.findByIdAndUpdate(
        id,
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          course: course.trim(),
          semester: Number(semester)
        },
        { new: true, runValidators: true }
      );

      if (!updatedStudent) {
        return res.status(404).json({
          status: 404,
          error: 'Not Found',
          message: `Requested student with ID ${id} does not exist.`
        });
      }

      res.status(200).json(updatedStudent);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          status: 400,
          error: 'Bad Request',
          message: 'Validation failed for request body',
          errors: [`Email address "${email.trim()}" is already registered by another student.`]
        });
      }

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e) => e.message);
        return res.status(400).json({
          status: 400,
          error: 'Bad Request',
          message: 'Validation failed for request body',
          errors: messages
        });
      }

      console.error('Error updating student:', error);
      res.status(500).json({
        status: 500,
        error: 'Internal Server Error',
        message: 'Failed to update student record.'
      });
    }
  });
});

/**
 * @openapi
 * /students/{id}:
 *   delete:
 *     summary: Delete a student document from MongoDB
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The student MongoDB ObjectId
 *     responses:
 *       204:
 *         description: Student deleted successfully (No Content)
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Student not found
 */
app.delete('/students/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Invalid student ID parameter. ID must be a valid MongoDB ObjectId.'
    });
  }

  try {
    const deletedStudent = await Student.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: `Requested student with ID ${id} does not exist.`
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete student record.'
    });
  }
});

// Global 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
});

// Global 500 Error Handler & JSON Parse Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Malformed JSON syntax in request body.'
    });
  }
  console.error('Unhandled Error:', err);
  res.status(500).json({
    status: 500,
    error: 'Internal Server Error',
    message: 'An unexpected server-side failure occurred.'
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Express Student API running on http://localhost:${PORT}`);
    console.log(`Swagger UI available on http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
