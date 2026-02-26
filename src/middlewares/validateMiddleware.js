import Joi from 'joi';
import httpStatus from 'http-status-codes';
import ApiError from '../utils/ApiError.js';

export function validate(schema) {
  return (req, res, next) => {
    const segments = ['params', 'query', 'body'];
    const toValidate = {};

    segments.forEach((key) => {
      if (schema[key]) {
        toValidate[key] = req[key];
      }
    });

    const { error, value } = Joi.compile(schema)
      .prefs({ abortEarly: false, allowUnknown: true })
      .validate(toValidate);

    if (error) {
      const details = error.details.map((d) => d.message);
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Validation error', details));
    }

    segments.forEach((key) => {
      if (value[key]) {
        req[key] = value[key];
      }
    });

    next();
  };
}

