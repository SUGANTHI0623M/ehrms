const express = require('express');
const { createCustomer, getAllCustomers, getCustomerById, updateCustomer } = require('../controllers/customerController');
const router = express.Router();

router.post('/', createCustomer);
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.patch('/:id', updateCustomer);

module.exports = router;