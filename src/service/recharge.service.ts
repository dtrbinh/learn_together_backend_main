import { CreateRechargeOrderParams } from "../interfaces/rechargeOrder.interface.js";
import { RechargeOrderModel } from "../models/rechargeOrder.model.js";

export const createRechargeOrder = async (
  request: CreateRechargeOrderParams
) => {
  return await RechargeOrderModel.create(request);
};

export const findRechargeOrderPaginate = async (
  keyword: any,
  page: number,
  perPage: number
) => {
  const classrooms = await RechargeOrderModel.find(keyword)
    .sort({ created_at: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage);
  return classrooms;
};
