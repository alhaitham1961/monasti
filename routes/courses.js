const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all courses with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      level,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      isPublished: true
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (level) {
      where.level = level;
    }

    if (minPrice) {
      where.price = { gte: parseFloat(minPrice) };
    }

    if (maxPrice) {
      where.price = { lte: parseFloat(maxPrice) };
    }

    // Build order clause
    const orderBy = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'level') {
      orderBy.level = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          coach: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              currency: true,
              profile: true
            }
          },
          _count: {
            select: {
              enrollments: true
            }
          }
        },
        orderBy,
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.course.count({ where })
    ]);

    res.json({
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currency: true,
            profile: true
          }
        },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create course (coach only)
router.post('/', authenticateToken, [
  body('title').isLength({ min: 3, max: 100 }).trim(),
  body('description').isLength({ min: 10, max: 1000 }).trim(),
  body('price').isFloat({ min: 0 }),
  body('currency').optional().isIn(['IQD', 'USD']),
  body('duration').isInt({ min: 15, max: 480 }),
  body('level').isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  body('thumbnail').optional().isURL(),
  body('videoUrl').optional().isURL(),
  body('materials').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { title, description, price, currency = 'IQD', duration, level, thumbnail, videoUrl, materials } = req.body;

    // Check if coach exists
    const coach = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (coach.role !== 'COACH') {
      return res.status(403).json({ error: 'Only coaches can create courses' });
    }

    // materials is Json in PostgreSQL - pass array directly
    const course = await prisma.course.create({
      data: {
        title,
        description,
        price,
        currency,
        duration,
        level,
        thumbnail,
        videoUrl,
        materials,
        coachId: req.user.userId
      },
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currency: true,
            profile: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Course created successfully',
      course
    });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update course (coach only)
router.put('/:id', authenticateToken, [
  body('title').optional().isLength({ min: 3, max: 100 }).trim(),
  body('description').optional().isLength({ min: 10, max: 1000 }).trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('currency').optional().isIn(['IQD', 'USD']),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  body('level').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  body('thumbnail').optional().isURL(),
  body('videoUrl').optional().isURL(),
  body('materials').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const course = await prisma.course.findUnique({
      where: { id: req.params.id }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.coachId !== req.user.userId) {
      return res.status(403).json({ error: 'Only course coach can update this course' });
    }

    // SECURITY: whitelist only allowed fields (prevents mass assignment)
    const { title, description, price, duration, level, thumbnail, videoUrl, materials } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (duration !== undefined) updateData.duration = duration;
    if (level !== undefined) updateData.level = level;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (materials !== undefined) updateData.materials = materials;

    const updatedCourse = await prisma.course.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currency: true,
            profile: true
          }
        }
      }
    });

    res.json({
      message: 'Course updated successfully',
      course: updatedCourse
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete course (coach only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.coachId !== req.user.userId) {
      return res.status(403).json({ error: 'Only course coach can delete this course' });
    }

    await prisma.course.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Course deleted successfully' });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;