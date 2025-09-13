const express = require('express');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/cart.validation');
const cartController = require('../../controllers/cart.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/', auth(), cartController.getUserCartItems);
router.post('/', auth(), validate(validation.addToCart), cartController.addToCart);
router.patch('/', auth(), validate(validation.updateCart), cartController.updateCart);
router.delete('/:id', auth(), validate(validation.deleteCart), cartController.remove);
router.patch('/user-cart', auth(), validate(validation.userLocalStorageCart), cartController.userLocalStorageCart);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Cart management
 */

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: Add product to cart
 *     description: Adds a product to the authenticated user's cart.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - totalProduct
 *               - weight
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to add
 *                 example: 60d21b4667d0d8992e610c85
 *               totalProduct:
 *                 type: number
 *                 description: Quantity of the product to add
 *                 example: 2
 *               weight:
 *                 type: string
 *                 description: Selected product weight/variant (e.g., "250gm" or "1kg")
 *                 example: "250gm"
 *     responses:
 *       "201":
 *         description: Item added to cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Added to cart successfully
 *                 cart:
 *                   $ref: '#/components/schemas/Cart'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /cart/{id}:
 *   delete:
 *     summary: Remove product from cart
 *     description: Deletes a specific product from the authenticated user's cart.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the product to remove from the cart
 *         schema:
 *           type: string
 *           example: 60d21b4667d0d8992e610c85
 *     responses:
 *       "200":
 *         description: Product removed from cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Product removed from cart successfully
 *                 cart:
 *                   $ref: '#/components/schemas/Cart'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         description: Product not found in cart
 */
