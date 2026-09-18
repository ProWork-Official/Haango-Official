import * as couponService from '../services/couponService.js';
import { success } from '../utils/response.js';

export async function validate(req, res, next) {
  try {
    res.json(success(await couponService.validateBookingCoupon(req.body?.code, req.user, req.body?.totalAmount)));
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try { res.json(success(await couponService.listCoupons())); } catch (error) { next(error); }
}

export async function create(req, res, next) {
  try { res.status(201).json(success(await couponService.createCoupon(req.body || {}, req.user, req))); } catch (error) { next(error); }
}

export async function remove(req, res, next) {
  try { res.json(success(await couponService.deleteCoupon(req.params.id))); } catch (error) { next(error); }
}
