const Customer = require('../models/Customer');

exports.createCustomer = async (req, res) => {
  try {
    const newCustomer = new Customer(req.body);
    await newCustomer.save();
    res.status(201).json({ success: true, data: newCustomer });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    console.log('[Customers] GET /customers - fetching all customers...');
    const customers = await Customer.find();
    console.log('[Customers] Fetched', customers.length, 'customer(s)');
    res.status(200).json(customers);
  } catch (error) {
    console.error('[Customers] Error fetching customers:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customerId = req.params.id;
    console.log('[Customers] GET /customers/:id - customerId:', customerId);
    const customer = await Customer.findById(customerId);
    if (!customer) {
      console.log('[Customers] Customer not found:', customerId);
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    console.log('[Customers] Fetched customer:', customer.name || customerId);
    res.status(200).json(customer);
  } catch (error) {
    console.error('[Customers] Error fetching customer by ID:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await Customer.findByIdAndUpdate(customerId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.status(200).json(customer);
  } catch (error) {
    console.error('[Customers] Error updating customer:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};