const router = require('express').Router();
const controller = require('../../controllers/productCategory.controller');
const auth = require('../../middlewares/auth');
const validation = require('../../validations/product.category.validation');
const validate = require('../../middlewares/validate');

router.post('/product-category', auth(), validate(validation.createCategory), controller.create);
router.get('/product-category', controller.getAll);
router.get('/product-category/:id', validate(validation.getCategoryById), controller.getById);
router.put('/product-category/:id', auth(), validate(validation.updateCategory), controller.update);
router.delete('/product-category/:id', auth(), validate(validation.deleteCategory), controller.remove);
module.exports = router;

/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Category management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CategoryInput:
 *       type: object
 *       required:
 *         - category
 *         - name
 *       properties:
 *         category:
 *           type: string
 *           description: Unique category identifier (slug or key)
 *           example: electronics
 *         name:
 *           type: string
 *           description: Display name of the category
 *           example: Electronics
 *         description:
 *           type: string
 *           description: Brief description of the category
 *           example: Devices, gadgets, and electronic accessories
 *         heroImage:
 *           type: string
 *           description: URL of the hero image for the category
 *           example: https://example.com/images/electronics.jpg
 *         pricingEnabled:
 *           type: boolean
 *           description: Flag to enable or disable pricing for the category
 *           example: true
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Category ID
 *           example: 507f1f77bcf86cd799439011
 *         category:
 *           type: string
 *           description: Unique category identifier
 *           example: electronics
 *         name:
 *           type: string
 *           description: Display name of the category
 *           example: Electronics
 *         description:
 *           type: string
 *           description: Brief description of the category
 *           example: Devices, gadgets, and electronic accessories
 *         heroImage:
 *           type: string
 *           description: URL of the hero image for the category
 *           example: https://example.com/images/electronics.jpg
 *         pricingEnabled:
 *           type: boolean
 *           description: Flag to enable or disable pricing for the category
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the category was created
 *           example: 2023-01-01T00:00:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the category was last updated
 *           example: 2023-01-01T00:00:00.000Z
 *   parameters:
 *     Id:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: Category ID
 *       example: 507f1f77bcf86cd799439011
 */

/**
 * @swagger
 * /categories/product-category:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Category created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Categories fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /categories/product-category/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Category fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       200:
 *         description: Updated category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Category updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Category deleted successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
