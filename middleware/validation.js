const { body, validationResult } = require('express-validator');

const validateInput = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors
    });
  };
};

module.exports = { validateInput };