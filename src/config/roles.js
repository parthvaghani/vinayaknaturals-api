const allRoles = {
  user: ['getUser', 'updateUser', 'calculateCommission'],
  admin: [
    'getUsers',
    'getUser',
    'updateUser',
    'deleteUser',
    'createUser',
    'manageUsers',
    'createBank',
    'getBanks',
    'getBank',
    'updateBank',
    'deleteBank',
    'assignBank',
    'getUserCommissionConfig',
    'updateUserCommissionConfig',
    'deleteUserCommissionConfig',
    'calculateCommission',
    'getAllTransactions',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

const adminUserTypePermissions = {
  super_admin: ['*'],
  finance_admin: [
    'VIEW_USERS',
    'VIEW_KYC',
    'VIEW_TRANSACTIONS',
    'EXPORT_TRANSACTIONS',
    'VIEW_PAYOUTS',
    'INITIATE_PAYOUTS',
    'VIEW_BANKS',
    'EXPORT_DATA',
  ],
  support_admin: [
    'VIEW_USERS',
    'VIEW_KYC',
    'VIEW_SUPPORT_TICKETS',
    'RESPOND_SUPPORT_TICKETS',
  ],
  view_only_admin: [
    'VIEW_USERS',
    'VIEW_KYC',
    'VIEW_TRANSACTIONS',
    'VIEW_PAYOUTS',
    'VIEW_BANKS',
    'VIEW_SUPPORT_TICKETS',
  ],
};

const allAdminUserTypes = ['super_admin', 'finance_admin', 'support_admin', 'view_only_admin'];

const allAdminPermissions = [
  'VIEW_USERS',
  'EDIT_USERS',
  'DELETE_USERS',
  'VIEW_KYC',
  'APPROVE_KYC',
  'VIEW_TRANSACTIONS',
  'EXPORT_TRANSACTIONS',
  'VIEW_PAYOUTS',
  'INITIATE_PAYOUTS',
  'VIEW_BANKS',
  'EDIT_BANKS',
  'VIEW_SUPPORT_TICKETS',
  'RESPOND_SUPPORT_TICKETS',
  'EXPORT_DATA',
];

module.exports = {
  roles,
  roleRights,
  adminUserTypePermissions,
  allAdminUserTypes,
  allAdminPermissions,
};
