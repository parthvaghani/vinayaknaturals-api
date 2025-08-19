const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { excelService } = require('../services');
const ExcelJS = require('exceljs');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const searchTerm = req.query.searchTerm;
  let searchQuery = req.query.searchQuery || '';
  searchQuery = searchQuery.replace(/^\+/, '');
  const fieldsToMap = ['businessName'];
  // Handle status filter
  if (req.query.status) {
    filter.isActive = req.query.status === 'active';
  }

  fieldsToMap.forEach((field) => {
    if (filter[field]) {
      filter[`user_details.${field}`] = filter[field];
      delete filter[field];
    }
  });

  if (req.query.isExport) {
    const fileName = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');


    const result = await excelService.getUsers(options);
    if (result.length > 0) {
      const headers = Object.keys(result[0]);

      worksheet.addRow(headers);
      worksheet.getRow(1).font = {
        bold: true,
        size: 14
      };

      result.forEach(item => {
        const rowData = headers.map(header => item[header]);
        worksheet.addRow(rowData);
      });

      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });
    }
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Data = buffer.toString('base64');
    return res.status(200).json({
      success: true,
      data: base64Data,
      fileName: fileName,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length
    });
  } else {
    const result = await userService.queryUsers(filter, options, searchTerm, searchQuery);
    res.send(result);
  }
});

const getUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send({ ...user._doc });
});

const updateUser = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const updateData = { ...req.body };

  // Initialize user_details as an empty object if it doesn't exist or isn't an object
  // if (!updateData.user_details || typeof updateData.user_details !== 'object') {
  //   updateData.user_details = {};
  // }

  // // Map root level fields to user_details if they exist
  // const userDetailFields = ['name', 'country', 'city', 'zip', 'address', 'gender', 'phone', 'avatar'];
  // userDetailFields.forEach(field => {
  //   if (req.body[field] !== undefined) {
  //     updateData.user_details[field] = req.body[field];
  //   }
  // });

  // // Clean up - remove root level fields that were moved to user_details
  // userDetailFields.forEach(field => {
  //   if (field in updateData) {
  //     delete updateData[field];
  //   }
  // });

  // // Handle file upload if present
  // if (req.file) {
  //   const imageUrl = await userService.uploadProfileImageS3(userId, req.file, 'profile-images');
  //   updateData.user_details = updateData.user_details || {};
  //   updateData.user_details.avatar = imageUrl;
  // }

  const updatedUser = await userService.updateUserProfileById(userId, updateData);

  res.status(200).json({
    message: 'User updated successfully',
    data:true
  });
});

const clearToken = catchAsync(async (req, res) => {
  await userService.clearToken(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.send({ message: 'User deleted successfully' });
});

// const uploadProfileImage = catchAsync(async (req, res) => {
//   const file = req.file;
//   const userId = req.params.userId;
//   const imageUrl = await userService.uploadProfileImageS3(userId, file, 'profile-images');
//   await userService.updateUserProfileById(userId, { user_details: { avatar: imageUrl } });
//   res.send({ success: true, imageUrl, message: 'Profile picture updated!' });
// });

const getMe = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const userDoc = user.toJSON();

  if (user.role === 'admin') {
    const { userData } = await userService.getAllAdminData();
    return res.send({
      ...userDoc,
      userData
    });
  }

  delete userDoc.password;
  delete userDoc.acceptedTerms;
  delete userDoc.profileCompleted;
  delete userDoc.commissionConfig;

  res.send({
    ...userDoc,
  });
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  clearToken,
  getMe,
};
