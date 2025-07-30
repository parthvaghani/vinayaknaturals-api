const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');
const { upload } = require('../../Helpers/multer');
const { getAdminMeta } = require('../../controllers/user.controller');

const router = express.Router();

// Root routes
router
  .route('/')
  .post(auth('manageUsers'), validate(userValidation.createUser), userController.createUser)
  .get(auth('getUsers'), validate(userValidation.getUsers), userController.getUsers);

// Get all commission configurations route
router
  .route('/commission-configs')
  .get(auth('manageUsers'), validate(userValidation.getAllCommissionConfigs), userController.getAllCommissionConfigs);

// Specific routes (no parameters)
router.route('/me').get(auth(), userController.getMe);

// Search routes
router.route('/search-cities/:searchTerms').get(validate(userValidation.searchCities), userController.searchCities);
router.route('/search-state/:searchTerms').get(validate(userValidation.searchStates), userController.searchStates);
router.route('/search/:userId/:searchTerm').get(validate(userValidation.searchUser), userController.searchAndGetUser);

// User ID based routes
router
  .route('/:userId')
  .get(auth('getUser'), validate(userValidation.getUser), userController.getUser)
  .patch(
    auth(),
    upload.single('avatar'),
    validate(userValidation.updateUser),
    userController.updateUser
  )
  .delete(auth('manageUsers'), validate(userValidation.deleteUser), userController.deleteUser);

router.route('/:userId/clearDeviceToken').patch(validate(userValidation.deleteUser), userController.clearToken);

router
  .route('/:userId/upload')
  .post(
    auth('manageUsers'),
    upload.single('file'),
    validate(userValidation.uploadProfileImage),
    userController.uploadProfileImage,
  );

router.route('/:userId/get-user').post(auth('manageUsers'), validate(userValidation.getUser), userController.get_user);
router
  .route('/update-user-status/:id')
  .patch(auth('manageUsers'), validate(userValidation.updateUserStatus), userController.setUserActiveStatus);

// Commission configuration routes - admin only
router
  .route('/:userId/commission-config')
  .get(auth('manageUsers'), validate(userValidation.getUserCommissionConfig), userController.getUserCommissionConfig)
  .put(auth('manageUsers'), validate(userValidation.updateUserCommissionConfig), userController.updateUserCommissionConfig)
  .delete(
    auth('manageUsers'),
    validate(userValidation.deleteUserCommissionConfig),
    userController.deleteUserCommissionConfig,
  );

// Admin-only: Transfer PG balance to available balance
router.post(
  '/:userId/transfer-pg-balance',
  auth('manageUsers'),
  validate(userValidation.transferPgBalance),
  userController.transferPgBalance
);

router
  .route('/:userId/calculate-commission')
  .post(auth('calculateCommission'), validate(userValidation.calculateCommission), userController.calculateCommission);

// Admin meta endpoint
router.route('/admin/meta').get(auth('manageUsers'), getAdminMeta);

router
  .route('/add-admin')
  .post(auth('manageUsers'), validate(userValidation.createAdmin), userController.createUser);

module.exports = router;

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user
 *     description: Allows admin to create a new user account.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - businessName
 *               - phoneNumber
 *               - password
 *               - user_details
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               businessName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^\\+[1-9]\\d{1,14}$'
 *                 example: "+1234567890"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 pattern: "^(?=.*[A-Za-z])(?=.*\\d)"
 *                 description: Must contain at least one letter and one number
 *               user_details:
 *                 type: object
 *                 required:
 *                   - name
 *                   - country
 *                   - gender
 *                 properties:
 *                   name:
 *                     type: string
 *                   country:
 *                     type: string
 *                   gender:
 *                     type: string
 *                     enum: [Male, Female, Other]
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *               acceptedTerms:
 *                 type: boolean
 *                 default: false
 *             example:
 *               email: "user@example.com"
 *               businessName: "Example Business"
 *               phoneNumber: "+911234567890"
 *               password: "pass1234"
 *               user_details:
 *                 name: "John Doe"
 *                 country: "India"
 *                 gender: "Male"
 *               role: "user"
 *               acceptedTerms: true
 *     responses:
 *       "201":
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user
 *     description: Logged in users can fetch only their own user information. Only admins can fetch other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a user
 *     description: Logged in users can only update their own information. Only admins can update other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_details:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   businessName:
 *                     type: string
 *                   businessDesc:
 *                     type: string
 *                   businessAddress:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   GSTNo:
 *                     type: string
 *                   majorRoutes:
 *                     type: string
 *                   truckTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   materialShipped:
 *                     type: array
 *                     items:
 *                       type: string
 *                   avatar:
 *                     type: string
 *                   pincode:
 *                     type: number
 *             example:
 *               user_details:
 *                 firstName: "fake name"
 *                 lastName: "fake name"
 *                 businessName: "Your business name"
 *                 businessDesc: "A description of the business with at most 50 words."
 *                 businessAddress: "D-143-B, Kaushalya Path, Basant Marg, Bani Park, Jaipur 302016, Rajasthan, India"
 *                 city: "Surat"
 *                 state: "Gujarat"
 *                 GSTNo: "27AAAPL1234C1Z0"
 *                 majorRoutes:  "Route 1, Route 2, Route 3"
 *                 truckTypes: ["mahindra-open-body-truck-14-wheeler","mahindra-open-body-truck-16-wheeler","container-14-ft"]
 *                 materialShipped: ["apparels","automotive","beverages-and-Drinks"]
 *                 avatar: "profile_avatar_url"
 *                 pincode: 123456
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a user
 *     description: Logged in users can delete only themselves. Only admins can delete other users.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /users/search/{userId}/{searchTerm}:
 *   get:
 *     summary: Search for a user by userId and search term
 *     description: Search for a user by userId and either phone number.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: user ID
 *       - in: path
 *         name: searchTerm
 *         required: true
 *         schema:
 *           type: string
 *         description: The search term to look for in phone number.
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 connectionStatus:
 *                   type: string
 *                   enum: [not_connected, request_send, connected]
 *                   example: connected
 *                 result:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /users/{id}/upload:
 *   post:
 *     summary: Upload/update profile picture
 *     description: Logged in users can only update their own profile picture.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The profile image to upload.
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /users/search-user/{userId}:
 *   get:
 *     summary: Search for Shipper & Currier based on name, from, to.
 *     tags: [Users]
 *     security:
 *        - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID.
 *       - in: query
 *         name: recipientId
 *         schema:
 *           type: string
 *         description: Recipient user id (to filter by user)
 *       - in: query
 *         name: searchTerms
 *         schema:
 *           type: string
 *         description: Search terms used to find matching shipments or couriers.
 *       - in: query
 *         name: fromCity
 *         schema:
 *           type: string
 *         description: From city
 *       - in: query
 *         name: toCity
 *         schema:
 *           type: string
 *         description: To city
 *       - in: query
 *         name: truckType
 *         schema:
 *           type: string
 *         description: Truck types
 *       - in: query
 *         name: materialType
 *         schema:
 *           type: string
 *         description: Material types
 *     responses:
 *       '200':
 *         description: Successful response with search results.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 result:
 *                   type: object
 *                   properties:
 *                     records:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           from:
 *                             type: string
 *                             example: ca
 *                           to:
 *                             type: string
 *                             example: usa
 *                           vehicleType:
 *                             type: string
 *                             example: Truck
 *                           material:
 *                             type: string
 *                             example: good
 *                           paymentTerms:
 *                             type: string
 *                             example: Oneday
 *                           available:
 *                             type: string
 *                             example: usa
 *
 *       '404':
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User not found
 */

/**
 * @swagger
 * /users/search-cities/{searchTerms}:
 *   get:
 *     summary: Search cities based on search terms
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: searchTerms
 *         required: true
 *         schema:
 *           type: string
 *         description: Search terms to filter cities
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 result:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                         example: City Name
 *                       state:
 *                         type: string
 *                         example: State Name
 *       404:
 *         description: No results found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No results found
 *                 error:
 *                   type: string
 *                   example: Sorry, no results found
 */

/**
 * @swagger
 * /users/search-cities/{searchTerms}:
 *   get:
 *     tags:
 *       - Search
 *     summary: Search cities
 *     description: Search for cities based on the search term
 *     parameters:
 *       - name: searchTerms
 *         in: path
 *         schema:
 *           type: string
 *         required: true
 *         description: The search term for cities
 *     responses:
 *       200:
 *         description: A list of cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       city:
 *                         type: string
 *       404:
 *         description: No data found
 *
 * /users/search-state/{searchTerms}:
 *   get:
 *     tags:
 *       - Search
 *     summary: Search states
 *     description: Search for states based on the search term
 *     parameters:
 *       - name: searchTerms
 *         in: path
 *         schema:
 *           type: string
 *         required: true
 *         description: The search term for states ('all' for all states)
 *     responses:
 *       200:
 *         description: A list of states
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *       404:
 *         description: No data found
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user details
 *     description: Get the details of the currently authenticated user based on their JWT token
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "user@example.com"
 *                 phoneNumber:
 *                   type: string
 *                   example: "+911234567890"
 *                 role:
 *                   type: string
 *                   enum: [user, admin]
 *                   example: "user"
 *                 user_details:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     businessName:
 *                       type: string
 *                       example: "My Business"
 *                     country:
 *                       type: string
 *                       example: "India"
 *                     gender:
 *                       type: string
 *                       enum: [Male, Female, Other]
 *                       example: "Male"
 *                     avatar:
 *                       type: string
 *                       example: "https://example.com/avatar.jpg"
 *                     businessDesc:
 *                       type: string
 *                       example: "A description of the business"
 *                     businessAddress:
 *                       type: string
 *                       example: "123 Business Street"
 *                     city:
 *                       type: string
 *                       example: "Mumbai"
 *                     state:
 *                       type: string
 *                       example: "Maharashtra"
 *                     GSTNo:
 *                       type: string
 *                       example: "27AAAPL1234C1Z0"
 *                     majorRoutes:
 *                       type: string
 *                       example: "Route 1, Route 2"
 *                     truckTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["mahindra-open-body-truck-14-wheeler", "container-14-ft"]
 *                     materialShipped:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["apparels", "automotive"]
 *                     pincode:
 *                       type: number
 *                       example: 400001
 *                 profileCompleted:
 *                   type: boolean
 *                   example: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *       "401":
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: "Please authenticate"
 *       "404":
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "User not found"
 */

/**
 * @swagger
 * /users/update-user-status/{id}:
 *   patch:
 *     summary: Update user active/inactive status
 *     description: Allows admin to activate or deactivate a user account by ID.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: Set to `true` to activate, `false` to deactivate
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User activated
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /users/{userId}:
 *   patch:
 *     summary: Update a user
 *     description: Allows an admin to update user details.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^\\+[1-9]\\d{1,14}$'
 *                 example: "+1234567890"
 *               finflexKeys:
 *                 type: object
 *                 properties:
 *                   accessKey:
 *                     type: string
 *                     description: User's access key for API authentication
 *                   merchantKey:
 *                     type: string
 *                     description: Merchant key for payment processing
 *                   clientId:
 *                     type: string
 *                     description: Client ID for API integration
 *                   apiPassword:
 *                     type: string
 *                     description: Password for API authentication
 *               user_details:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   country:
 *                     type: string
 *                   gender:
 *                     type: string
 *                     enum: [Male, Female, Other]
 *               isActive:
 *                 type: boolean
 *               availableBalance:
 *                 type: number
 *             example:
 *               businessName: "Updated Business"
 *               email: "updated@example.com"
 *               phoneNumber: "+19876543210"
 *               finflexKeys:
 *                 accessKey: "finflex_test_123456789"
 *                 merchantKey: "finflex_test_987654321"
 *                 clientId: "finflex_test_client_123456"
 *                 apiPassword: "finflex_test_987654321"
 *               user_details:
 *                 name: "Jane Smith"
 *                 country: "USA"
 *                 gender: "Female"
 *               isActive: true
 *               availableBalance: 100.50
 *     responses:
 *       "200":
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: User not found
 */

/**
 * @swagger
 * /users/commission-configs:
 *   get:
 *     summary: Get all commission configurations
 *     description: Get commission configurations for all users.
 *     tags: [Commission Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by query in the form of field:desc/asc (ex. businessName:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Maximum number of users
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       businessName:
 *                         type: string
 *                       email:
 *                         type: string
 *                         format: email
 *                       commissionConfig:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/CommissionConfig'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/{userId}/commission-config:
 *   get:
 *     summary: Get user commission configuration
 *     description: Get commission configuration for a specific user.
 *     tags: [Commission Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 commissionConfig:
 *                   $ref: '#/components/schemas/CommissionConfig'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   put:
 *     summary: Update user commission configuration
 *     description: Update commission configuration for a specific user.
 *     tags: [Commission Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commissionConfig
 *             properties:
 *               commissionConfig:
 *                 $ref: '#/components/schemas/CommissionConfig'
 *             example:
 *               commissionConfig:
 *                 commissionType: payout
 *                 startRange: 0
 *                 endRange: 0
 *                 chargeType: percentage
 *                 value: 5
 *     responses:
 *       "200":
 *         description: OK
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
 *                   example: "Commission configuration updated successfully"
 *                 commissionConfig:
 *                   $ref: '#/components/schemas/CommissionConfig'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Reset user commission configuration
 *     description: Reset a user's commission configuration to defaults.
 *     tags: [Commission Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       "200":
 *         description: OK
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
 *                   example: "Commission configuration reset to defaults"
 *                 commissionConfig:
 *                   $ref: '#/components/schemas/CommissionConfig'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /users/{userId}/calculate-commission:
 *   post:
 *     summary: Calculate commission
 *     description: Calculate commission for a specific amount based on user's commission configuration.
 *     tags: [Commission Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Transaction amount
 *             example:
 *               amount: 1000
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 originalAmount:
 *                   type: number
 *                   example: 1000
 *                 commissionAmount:
 *                   type: number
 *                   example: 0.5
 *                 finalAmount:
 *                   type: number
 *                   example: 1000.5
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /users/add-admin:
 *   post:
 *     summary: Create a new admin user
 *     description: Only users with admin privileges can create new admin users.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - user_details
 *               - role
 *               - userType
 *               - email
 *               - password
 *             properties:
 *               businessName:
 *                 type: string
 *                 description: Business name for the admin
 *                 example: "Finflex Admin"
 *               user_details:
 *                 type: object
 *                 required:
 *                   - name
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Full name of the admin
 *                     example: "John Admin"
 *               role:
 *                 type: string
 *                 enum: [admin]
 *                 default: admin
 *                 description: User role (always admin for this endpoint)
 *               userType:
 *                 type: string
 *                 enum: [super_admin, finance_admin, support_admin, view_only_admin]
 *                 description: Type of admin user with different permission levels
 *                 example: "super_admin"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the admin
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: Password must contain at least one letter and one number
 *                 example: "Admin123"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific permissions for this admin
 *                 example: ["manageUsers", "viewReports"]
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the admin account is active
 *     responses:
 *       "201":
 *         description: Admin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "5ebac534954b54139806c112"
 *                     email:
 *                       type: string
 *                       example: "admin@example.com"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     userType:
 *                       type: string
 *                       example: "super_admin"
 *                     businessName:
 *                       type: string
 *                       example: "Finflex Admin"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-01T00:00:00.000Z"
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/{userId}/transfer-pg-balance:
 *   post:
 *     summary: Transfer PG balance to available balance
 *     description: Admins can transfer a specified amount from a user's pgBalance to their availableBalance.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to transfer balance for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to transfer from pgBalance to availableBalance
 *                 example: 100.5
 *     responses:
 *       200:
 *         description: PG balance transferred successfully
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
 *                   example: PG balance transferred successfully
 *                 pgBalance:
 *                   type: number
 *                   example: 400.5
 *                 availableBalance:
 *                   type: number
 *                   example: 1200.5
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

