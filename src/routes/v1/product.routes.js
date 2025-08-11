const validate = require('../../middlewares/validate');
const validation = require('../../validations/product.validation');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const controller = require('../../controllers/product.controller');


router.post('/product', auth(), validate(validation.createProduct), controller.create);
router.get('/product', controller.getAll);
router.get('/product/:id', validate(validation.getProductById), controller.getById);
router.put('/product/:id', auth(), validate(validation.updateProduct), controller.update);
router.delete('/product/:id', auth(), validate(validation.deleteProduct), controller.remove);


module.exports = router;

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     Variant:
 *       type: object
 *       properties:
 *         weight:
 *           type: string
 *           example: "250"
 *         price:
 *           type: number
 *           example: 299
 *         discount:
 *           type: number
 *           example: 10
 *
 *     ProductInput:
 *       type: object
 *       required:
 *         - category
 *         - name
 *         - description
 *         - images
 *         - ingredients
 *         - benefits
 *         - isPremium
 *         - isPopular
 *         - variants
 *       properties:
 *         category:
 *           type: string
 *           description: Category ID (ObjectId)
 *           example: 64e8b23b2c1f4b5c4d9e8f12
 *         name:
 *           type: string
 *           example: "Organic Honey"
 *         description:
 *           type: string
 *           example: "Pure organic honey with natural sweetness."
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             example: "https://example.com/image1.jpg"
 *         ingredients:
 *           type: array
 *           items:
 *             type: string
 *             example: "Honey"
 *         benefits:
 *           type: array
 *           items:
 *             type: string
 *             example: "Boosts immunity"
 *         isPremium:
 *           type: boolean
 *           example: true
 *         isPopular:
 *           type: boolean
 *           example: false
 *         variants:
 *           type: object
 *           properties:
 *             gm:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Variant'
 *             kg:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Variant'
 *
 *     Product:
 *       allOf:
 *         - $ref: '#/components/schemas/ProductInput'
 *         - type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: 64e8b23b2c1f4b5c4d9e8f56
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: "2025-08-04T09:45:30.000Z"
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               example: "2025-08-04T09:45:30.000Z"
 */

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product management
 */

/**
 * @swagger
 * /products/product:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Products fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */

/**
 * @swagger
 * /products/product/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 64e8b23b2c1f4b5c4d9e8f56
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *   put:
 *     summary: Update a product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *   delete:
 *     summary: Delete a product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
