const express = require('express');
const { createCustomer, getAllCustomers, getCustomerById } = require('../controllers/customerController');
const router = express.Router();

router.post('/', createCustomer);
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);

module.exports = router;