import * as itemModel from './item.js';
import * as userModel from './user.js';
import * as categoryModel from './category.js';

export const ItemModel = {
  getAllItems: itemModel.getAllItems,
  createItem: itemModel.createItem,
  getItemById: itemModel.getItemById,
  updateItem: itemModel.updateItem,
  deleteItem: itemModel.deleteItem,
};

export const UserModel = {
  getAllUsers: userModel.getAllUsers,
  createUser: userModel.createUser,
  getUserById: userModel.getUserById,
  getUserByEmail: userModel.getUserByEmail,
  updateUser: userModel.updateUser,
  deleteUser: userModel.deleteUser,
};

export const CategoryModel = {
  getAllCategories: categoryModel.getAllCategories,
  getCategoryById: categoryModel.getCategoryById,
  getCategoriesByUserId: categoryModel.getCategoriesByUserId,
  createCategory: categoryModel.createCategory,
  updateCategory: categoryModel.updateCategory,
  deleteCategory: categoryModel.deleteCategory,
};

