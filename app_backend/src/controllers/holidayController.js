
const HolidayTemplate = require('../models/HolidayTemplate');
const Staff = require('../models/Staff');
const mongoose = require('mongoose');

// @desc    Get holidays for employee
// @route   GET /api/holidays/employee
// @access  Private
const getEmployeeHolidays = async (req, res) => {
    try {
        const { year, search, page = 1, limit = 100 } = req.query;

        // Ensure we have staff info (populated by auth middleware)
        if (!req.staff) {
            return res.status(404).json({ success: false, message: 'Staff record not found' });
        }

        const businessId = req.staff.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Staff is not assigned to a business/company' });
        }

        // Find Holiday Template for this business
        // Logic: Find active template for this business
        // In the future, we might check assignedStaff, but for now getting the business default
        const query = {
            businessId: new mongoose.Types.ObjectId(businessId),
            isActive: true
        };

        const holidayTemplate = await HolidayTemplate.findOne(query);

        if (!holidayTemplate) {
            return res.json({
                success: true,
                data: {
                    holidays: [],
                    pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 }
                }
            });
        }

        // Filter holidays by year if provided
        let holidays = holidayTemplate.holidays || [];

        if (year) {
            const filterYear = Number(year);
            holidays = holidays.filter((holiday) => {
                const holidayDate = new Date(holiday.date);
                return holidayDate.getFullYear() === filterYear;
            });
        }

        // Search functionality
        if (search) {
            const searchLower = search.toLowerCase();
            holidays = holidays.filter((holiday) => {
                return holiday.name.toLowerCase().includes(searchLower) ||
                    holiday.type.toLowerCase().includes(searchLower);
            });
        }

        // Sort by date
        holidays.sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        // Pagination
        const total = holidays.length;
        const skip = (Number(page) - 1) * Number(limit);
        const paginatedHolidays = holidays.slice(skip, skip + Number(limit));

        // Get upcoming holidays (next 5)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingHolidays = holidays
            .filter((holiday) => new Date(holiday.date) >= today)
            .slice(0, 5);

        res.json({
            success: true,
            data: {
                holidays: paginatedHolidays,
                upcomingHolidays,
                totalHolidays: total,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get Holidays Error:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to fetch holidays' }
        });
    }
};

module.exports = {
    getEmployeeHolidays
};
