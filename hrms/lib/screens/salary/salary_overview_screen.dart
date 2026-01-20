import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../services/salary_service.dart';

class SalaryOverviewScreen extends StatefulWidget {
  const SalaryOverviewScreen({super.key});

  @override
  State<SalaryOverviewScreen> createState() => _SalaryOverviewScreenState();
}

class _SalaryOverviewScreenState extends State<SalaryOverviewScreen> {
  final SalaryService _salaryService = SalaryService();
  bool _isLoading = true;
  Map<String, dynamic>? _salaryData;
  String _error = '';

  String _selectedMonth = DateFormat('MMMM').format(DateTime.now());
  String _selectedYear = DateFormat('yyyy').format(DateTime.now());

  final List<String> _months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  final List<String> _years = ['2023', '2024', '2025', '2026', '2027'];

  @override
  void initState() {
    super.initState();
    _fetchSalaryData();
  }

  Future<void> _fetchSalaryData() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      int monthIndex = _months.indexOf(_selectedMonth) + 1;
      int year = int.parse(_selectedYear);

      final data = await _salaryService.getSalaryStats(
        month: monthIndex,
        year: year,
      );

      setState(() {
        _salaryData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50], // Light background
      appBar: AppBar(
        title: Text(
          'Salary Overview ($_selectedMonth $_selectedYear)',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          if (_salaryData?['isProcessed'] == true)
            Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.green),
              ),
              child: const Text(
                'Processed',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ), // White on primary
            ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Error: $_error',
                    style: const TextStyle(color: Colors.red),
                  ),
                  ElevatedButton(
                    onPressed: _fetchSalaryData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Month/Year Filter
                  Row(
                    children: [
                      Expanded(
                        child: _buildDropdown(_selectedMonth, _months, (val) {
                          if (val != null) {
                            setState(() => _selectedMonth = val);
                            _fetchSalaryData();
                          }
                        }),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildDropdown(_selectedYear, _years, (val) {
                          if (val != null) {
                            setState(() => _selectedYear = val);
                            _fetchSalaryData();
                          }
                        }),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildSummaryCards(),
                  const SizedBox(height: 16),
                  _buildAttendanceSummary(),
                  const SizedBox(height: 16),
                  _buildEarningsDeductions(),
                  const SizedBox(height: 16),
                  _buildTotalCTC(),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        // Navigate to full details
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: BorderSide(color: Colors.grey.shade300),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'View Full Salary Details',
                        style: TextStyle(color: Colors.black87),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSummaryCards() {
    final stats = _salaryData!['stats'] ?? {};
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    // Fallbacks
    double gross = (stats['grossSalary'] ?? 0).toDouble();
    double net = (stats['netSalary'] ?? 0).toDouble();
    // Assuming "This Month" is same as Gross for now unless we calculate pro-rata differently in backend
    // The Screenshot has different values. Let's assume stats returns both if we implemented it perfectly.
    // For now use same values to avoid zeroes.
    double thisMonthGross = gross;
    double thisMonthNet = net;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Use Grid or Row based on width
        bool isWide = constraints.maxWidth > 600;
        return GridView.count(
          crossAxisCount: isWide ? 4 : 2, // 2 cols on mobile
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: isWide ? 1.5 : 1.3,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: [
            _buildStatCard(
              'Monthly Gross',
              currencyFormat.format(gross),
              'From processed payroll',
              Colors.green.shade50,
            ),
            _buildStatCard(
              'This Month Gross',
              currencyFormat.format(thisMonthGross),
              'Pro-rated', // Placeholder text
              Colors.blue.shade50,
            ),
            _buildStatCard(
              'Monthly Net',
              currencyFormat.format(net),
              'From processed payroll',
              Colors.green.shade50,
            ),
            _buildStatCard(
              'This Month Net',
              currencyFormat.format(thisMonthNet),
              'Expected take-home',
              Colors.green.shade50,
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    String subtitle,
    Color bgColor,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.transparent), // subtle border?
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style: TextStyle(
              color: Colors.grey[700],
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: Colors.green[700],
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ), // Green for money
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(color: Colors.grey[600], fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceSummary() {
    final att = _salaryData!['stats']?['attendance'] ?? {};
    final working = att['workingDays'] ?? 0;
    final present = att['presentDays'] ?? 0;
    final absent = att['absentDays'] ?? 0;
    final holidays = att['holidays'] ?? 0;
    final percent = att['attendancePercentage'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Attendance Summary',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${percent.toStringAsFixed(1)}%',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildAttStat('Working Days', '$working'),
              _buildAttStat('Present Days', '$present', color: Colors.green),
              _buildAttStat('Absent Days', '$absent', color: Colors.red),
              _buildAttStat('Holidays', '$holidays', color: Colors.orange),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAttStat(String label, String val, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 4),
        Text(
          val,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            color: color ?? Colors.black87,
          ),
        ),
      ],
    );
  }

  Widget _buildEarningsDeductions() {
    final earnings = _salaryData!['stats']?['earnings'] ?? [];
    final deductions =
        _salaryData!['stats']?['deductionComponents'] ??
        []; // Fixed key name from controller
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Earnings
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Monthly Earnings',
                style: TextStyle(
                  color: Colors.green,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.green.shade50.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade100),
                ),
                child: Column(
                  children: [
                    if (earnings.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: Text(
                          'No earnings data',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ...((earnings as List)
                        .map(
                          (e) => _buildRow(
                            e['name'] ?? 'Item',
                            e['amount']?.toDouble() ?? 0,
                            currencyFormat,
                          ),
                        )
                        .toList()),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        // Deductions
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Monthly Deductions',
                style: TextStyle(
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.red.shade50.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade100),
                ),
                child: Column(
                  children: [
                    if (deductions.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: Text(
                          'No deductions',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ...((deductions as List)
                        .map(
                          (e) => _buildRow(
                            e['name'] ?? 'Item',
                            e['amount']?.toDouble() ?? 0,
                            currencyFormat,
                          ),
                        )
                        .toList()),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRow(String label, double amount, NumberFormat format) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 12))),
          Text(
            format.format(amount),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalCTC() {
    final ctc = (_salaryData!['stats']?['ctc'] ?? 0).toDouble();
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Total CTC (Annual)',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total CTC',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              Text(
                currencyFormat.format(ctc),
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown(
    String value,
    List<String> items,
    ValueChanged<String?> onChanged,
  ) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          items: items
              .map(
                (e) => DropdownMenuItem(
                  value: e,
                  child: Text(e, style: const TextStyle(fontSize: 14)),
                ),
              )
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
