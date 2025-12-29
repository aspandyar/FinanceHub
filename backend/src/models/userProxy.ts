import * as userModel from './user.js';

export const UserModel = {
  getAllUsers: userModel.getAllUsers,
  createUser: userModel.createUser,
  getUserById: userModel.getUserById,
  getUserByEmail: userModel.getUserByEmail,
  updateUser: userModel.updateUser,
  deleteUser: userModel.deleteUser,
};

