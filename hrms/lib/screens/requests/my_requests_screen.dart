import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_colors.dart';
import '../../services/request_service.dart';
import '../../widgets/app_drawer.dart';

// --- Shared Constants ---
const double kDialogFormWidth = 600.0;
final BorderRadius kButtonRadius = BorderRadius.circular(
  8.0,
); // Slightly curved, nearly rectangular

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'My Requests',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Leave', icon: Icon(Icons.calendar_today)),
            Tab(text: 'Loan', icon: Icon(Icons.account_balance_wallet)),
            Tab(text: 'Expense', icon: Icon(Icons.receipt)),
            Tab(text: 'Payslip', icon: Icon(Icons.description)),
          ],
        ),
      ),
      drawer: const AppDrawer(),
      body: TabBarView(
        controller: _tabController,
        children: const [
          LeaveRequestsTab(),
          LoanRequestsTab(),
          ExpenseRequestsTab(),
          PayslipRequestsTab(),
        ],
      ),
    );
  }
}

// --- LEAVE TAB ---

class LeaveRequestsTab extends StatefulWidget {
  const LeaveRequestsTab({super.key});

  @override
  State<LeaveRequestsTab> createState() => _LeaveRequestsTabState();
}

class _LeaveRequestsTabState extends State<LeaveRequestsTab> {
  final RequestService _requestService = RequestService();
  List<dynamic> _leaves = [];
  bool _isLoading = true;
  String _selectedStatus = 'All Status';
  final List<String> _statusOptions = [
    'All Status',
    'Pending',
    'Approved',
    'Rejected',
  ];

  @override
  void initState() {
    super.initState();
    _fetchLeaves();
  }

  Future<void> _fetchLeaves() async {
    setState(() => _isLoading = true);
    final result = await _requestService.getLeaveRequests(
      status: _selectedStatus,
    );
    if (mounted) {
      if (result['success']) {
        setState(() {
          _leaves = result['data'];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  void _showApplyLeaveDialog() {
    showDialog(
      context: context,
      builder: (ctx) => ApplyLeaveDialog(onSuccess: _fetchLeaves),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Controls Row
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 0,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              DropdownButton<String>(
                value: _selectedStatus,
                items: _statusOptions
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedStatus = val);
                    _fetchLeaves();
                  }
                },
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                onPressed: _showApplyLeaveDialog,
                icon: const Icon(Icons.add),
                label: const Text('Apply Leave'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),

        // List Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: Colors.grey[200],
          child: const Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  'Leave Type',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Dates',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 1,
                child: Text(
                  'Days',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Status',
                  style: TextStyle(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
        ),

        // List Content
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _leaves.isEmpty
              ? const Center(child: Text('No leave requests found'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _leaves.length,
                  separatorBuilder: (ctx, i) => const Divider(),
                  itemBuilder: (ctx, i) {
                    final leave = _leaves[i];
                    final start = DateFormat(
                      'MMM dd',
                    ).format(DateTime.parse(leave['startDate']));
                    final end = DateFormat(
                      'MMM dd',
                    ).format(DateTime.parse(leave['endDate']));

                    Color statusColor = Colors.grey;
                    if (leave['status'] == 'Approved')
                      statusColor = AppColors.success;
                    else if (leave['status'] == 'Rejected')
                      statusColor = AppColors.error;
                    else if (leave['status'] == 'Pending')
                      statusColor = AppColors.warning;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: Text(leave['leaveType'] ?? ''),
                          ),
                          Expanded(flex: 2, child: Text('$start - $end')),
                          Expanded(flex: 1, child: Text('${leave['days']}')),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: statusColor),
                                ),
                                child: Text(
                                  leave['status'],
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class ApplyLeaveDialog extends StatefulWidget {
  final VoidCallback onSuccess;
  const ApplyLeaveDialog({super.key, required this.onSuccess});

  @override
  State<ApplyLeaveDialog> createState() => _ApplyLeaveDialogState();
}

class _ApplyLeaveDialogState extends State<ApplyLeaveDialog> {
  final _formKey = GlobalKey<FormState>();
  final RequestService _requestService = RequestService();

  String _leaveType = 'Casual';
  DateTime? _startDate;
  DateTime? _endDate;
  final TextEditingController _reasonController = TextEditingController();
  bool _isSubmitting = false;

  int get _days {
    if (_startDate == null || _endDate == null) return 0;
    return _endDate!.difference(_startDate!).inDays + 1;
  }

  Future<void> _pickDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          // Reset end date if it's before new start date
          if (_endDate != null && _endDate!.isBefore(_startDate!)) {
            _endDate = null;
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select dates')));
      return;
    }

    setState(() => _isSubmitting = true);
    final result = await _requestService.applyLeave({
      'leaveType': _leaveType,
      'startDate': _startDate!.toIso8601String(),
      'endDate': _endDate!.toIso8601String(),
      'days': _days,
      'reason': _reasonController.text,
    });
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (result['success']) {
        widget.onSuccess();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave request submitted')),
        );
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: kDialogFormWidth,
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Apply for Leave',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text(
                  'Leave Type',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                DropdownButtonFormField<String>(
                  value: _leaveType,
                  items: ['Casual', 'Sick', 'Earned', 'Unpaid']
                      .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                      .toList(),
                  onChanged: (val) => setState(() => _leaveType = val!),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                const Text(
                  'Start Date',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                InkWell(
                  onTap: () => _pickDate(true),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _startDate == null
                              ? 'dd-mm-yyyy'
                              : DateFormat('dd-MM-yyyy').format(_startDate!),
                        ),
                        const Icon(Icons.calendar_today, size: 16),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                const Text(
                  'End Date',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                InkWell(
                  onTap: () => _pickDate(false),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _endDate == null
                              ? 'dd-mm-yyyy'
                              : DateFormat('dd-MM-yyyy').format(_endDate!),
                        ),
                        const Icon(Icons.calendar_today, size: 16),
                      ],
                    ),
                  ),
                ),
                if (_days > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      'Total Days: $_days',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                const SizedBox(height: 10),

                const Text(
                  'Reason',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _reasonController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Enter reason for leave',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  validator: (val) =>
                      val == null || val.isEmpty ? 'Reason is required' : null,
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: kButtonRadius,
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Submit Request'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- LOAN TAB ---

class LoanRequestsTab extends StatefulWidget {
  const LoanRequestsTab({super.key});

  @override
  State<LoanRequestsTab> createState() => _LoanRequestsTabState();
}

class _LoanRequestsTabState extends State<LoanRequestsTab> {
  final RequestService _requestService = RequestService();
  List<dynamic> _loans = [];
  bool _isLoading = true;
  String _selectedStatus = 'All Status';
  final List<String> _statusOptions = [
    'All Status',
    'Pending',
    'Approved',
    'Active',
    'Rejected',
    'Closed',
  ];

  @override
  void initState() {
    super.initState();
    _fetchLoans();
  }

  Future<void> _fetchLoans() async {
    setState(() => _isLoading = true);
    final result = await _requestService.getLoanRequests(
      status: _selectedStatus,
    );
    if (mounted) {
      if (result['success']) {
        setState(() {
          _loans = result['data'];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  void _showApplyLoanDialog() {
    showDialog(
      context: context,
      builder: (ctx) => RequestLoanDialog(onSuccess: _fetchLoans),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Controls Row
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 0,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              DropdownButton<String>(
                value: _selectedStatus,
                items: _statusOptions
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedStatus = val);
                    _fetchLoans();
                  }
                },
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                onPressed: _showApplyLoanDialog,
                icon: const Icon(Icons.add),
                label: const Text('Request Loan'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),

        // List Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: Colors.grey[200],
          child: const Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  'Loan Type',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Amount',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Tenure',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'EMI',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Status',
                  style: TextStyle(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
        ),

        // List Content
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _loans.isEmpty
              ? const Center(child: Text('No loan requests found'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _loans.length,
                  separatorBuilder: (ctx, i) => const Divider(),
                  itemBuilder: (ctx, i) {
                    final loan = _loans[i];

                    Color statusColor = Colors.grey;
                    if (loan['status'] == 'Approved' ||
                        loan['status'] == 'Active')
                      statusColor = AppColors.success;
                    else if (loan['status'] == 'Rejected')
                      statusColor = AppColors.error;
                    else if (loan['status'] == 'Pending')
                      statusColor = AppColors.warning;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: Text(loan['loanType'] ?? ''),
                          ),
                          Expanded(flex: 2, child: Text('₹${loan['amount']}')),
                          Expanded(
                            flex: 2,
                            child: Text('${loan['tenureMonths']} Months'),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text('₹${loan['emi'] ?? 0}'),
                          ),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: statusColor),
                                ),
                                child: Text(
                                  loan['status'],
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class RequestLoanDialog extends StatefulWidget {
  final VoidCallback onSuccess;
  const RequestLoanDialog({super.key, required this.onSuccess});

  @override
  State<RequestLoanDialog> createState() => _RequestLoanDialogState();
}

class _RequestLoanDialogState extends State<RequestLoanDialog> {
  final _formKey = GlobalKey<FormState>();
  final RequestService _requestService = RequestService();

  String _loanType = 'Personal';
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _tenureController = TextEditingController();
  final TextEditingController _interestController = TextEditingController(
    text: '0',
  ); // Default 0
  final TextEditingController _purposeController = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final result = await _requestService.applyLoan({
      'loanType': _loanType,
      'amount': double.tryParse(_amountController.text) ?? 0,
      'tenureMonths': int.tryParse(_tenureController.text) ?? 0,
      'interestRate': double.tryParse(_interestController.text) ?? 0,
      'purpose': _purposeController.text,
    });
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (result['success']) {
        widget.onSuccess();
        Navigator.pop(context);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Loan request submitted')));
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: kDialogFormWidth,
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Request Loan',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text(
                  'Loan Type',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                DropdownButtonFormField<String>(
                  value: _loanType,
                  items: ['Personal', 'Home', 'Education']
                      .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                      .toList(),
                  onChanged: (val) => setState(() => _loanType = val!),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                const Text(
                  'Amount (₹)',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Enter loan amount',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  validator: (val) =>
                      val == null || val.isEmpty ? 'Amount is required' : null,
                ),
                const SizedBox(height: 10),

                const Text(
                  'Tenure (Months)',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _tenureController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Enter tenure in months',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  validator: (val) =>
                      val == null || val.isEmpty ? 'Tenure is required' : null,
                ),
                const SizedBox(height: 10),

                const Text(
                  'Interest Rate (%)',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _interestController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                const Text(
                  'Purpose',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _purposeController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Enter purpose of loan',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  validator: (val) =>
                      val == null || val.isEmpty ? 'Purpose is required' : null,
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: kButtonRadius,
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Submit Request'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- EXPENSE TAB ---

class ExpenseRequestsTab extends StatefulWidget {
  const ExpenseRequestsTab({super.key});

  @override
  State<ExpenseRequestsTab> createState() => _ExpenseRequestsTabState();
}

class _ExpenseRequestsTabState extends State<ExpenseRequestsTab> {
  final RequestService _requestService = RequestService();
  List<dynamic> _expenses = [];
  bool _isLoading = true;
  String _selectedStatus = 'All Status';
  final List<String> _statusOptions = [
    'All Status',
    'Pending',
    'Approved',
    'Rejected',
    'Paid',
  ];

  @override
  void initState() {
    super.initState();
    _fetchExpenses();
  }

  Future<void> _fetchExpenses() async {
    setState(() => _isLoading = true);
    final result = await _requestService.getExpenseRequests(
      status: _selectedStatus,
    );
    if (mounted) {
      if (result['success']) {
        setState(() {
          _expenses = result['data'];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  void _showClaimExpenseDialog() {
    showDialog(
      context: context,
      builder: (ctx) => ClaimExpenseDialog(onSuccess: _fetchExpenses),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Controls Row
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 0,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              DropdownButton<String>(
                value: _selectedStatus,
                items: _statusOptions
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedStatus = val);
                    _fetchExpenses();
                  }
                },
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                onPressed: _showClaimExpenseDialog,
                icon: const Icon(Icons.add),
                label: const Text('Claim Expense'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),

        // List Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: Colors.grey[200],
          child: const Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  'Type',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Date',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Amount',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Status',
                  style: TextStyle(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
        ),

        // List Content
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _expenses.isEmpty
              ? const Center(child: Text('No expense requests found'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _expenses.length,
                  separatorBuilder: (ctx, i) => const Divider(),
                  itemBuilder: (ctx, i) {
                    final expense = _expenses[i];
                    final date = DateFormat(
                      'MMM dd, yyyy',
                    ).format(DateTime.parse(expense['date']));

                    Color statusColor = Colors.grey;
                    if (expense['status'] == 'Approved' ||
                        expense['status'] == 'Paid')
                      statusColor = AppColors.success;
                    else if (expense['status'] == 'Rejected')
                      statusColor = AppColors.error;
                    else if (expense['status'] == 'Pending')
                      statusColor = AppColors.warning;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: Text(expense['expenseType'] ?? ''),
                          ),
                          Expanded(flex: 2, child: Text(date)),
                          Expanded(
                            flex: 2,
                            child: Text('₹${expense['amount']}'),
                          ),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: statusColor),
                                ),
                                child: Text(
                                  expense['status'],
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class ClaimExpenseDialog extends StatefulWidget {
  final VoidCallback onSuccess;
  const ClaimExpenseDialog({super.key, required this.onSuccess});

  @override
  State<ClaimExpenseDialog> createState() => _ClaimExpenseDialogState();
}

class _ClaimExpenseDialogState extends State<ClaimExpenseDialog> {
  final _formKey = GlobalKey<FormState>();
  final RequestService _requestService = RequestService();

  String _expenseType = 'Travel';
  final TextEditingController _amountController = TextEditingController();
  DateTime? _date;
  final TextEditingController _descriptionController =
      TextEditingController(); // Description
  bool _isSubmitting = false;

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_date == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a date')));
      return;
    }

    setState(() => _isSubmitting = true);
    final result = await _requestService.applyExpense({
      'expenseType': _expenseType,
      'amount': double.tryParse(_amountController.text) ?? 0,
      'date': _date!.toIso8601String(),
      'description': _descriptionController.text,
    });
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (result['success']) {
        widget.onSuccess();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Expense claim submitted')),
        );
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: kDialogFormWidth,
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Claim Expense',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const Text(
                  'Submit a new expense claim',
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 20),

                const Text(
                  'Expense Type',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                DropdownButtonFormField<String>(
                  value: _expenseType,
                  items: ['Travel', 'Food', 'Accommodation', 'Other']
                      .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                      .toList(),
                  onChanged: (val) => setState(() => _expenseType = val!),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                const Text(
                  'Amount (₹)',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Enter expense amount',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  validator: (val) =>
                      val == null || val.isEmpty ? 'Amount is required' : null,
                ),
                const SizedBox(height: 10),

                const Text(
                  'Date',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                InkWell(
                  onTap: _pickDate,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _date == null
                              ? 'dd-mm-yyyy'
                              : DateFormat('dd-MM-yyyy').format(_date!),
                        ),
                        const Icon(Icons.calendar_today, size: 16),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                const Text(
                  'Description',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Enter expense description',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  validator: (val) => val == null || val.isEmpty
                      ? 'Description is required'
                      : null,
                ),
                const SizedBox(height: 20),

                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: kButtonRadius,
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Submit Claim'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- PAYSLIP TAB ---

class PayslipRequestsTab extends StatefulWidget {
  const PayslipRequestsTab({super.key});

  @override
  State<PayslipRequestsTab> createState() => _PayslipRequestsTabState();
}

class _PayslipRequestsTabState extends State<PayslipRequestsTab> {
  final RequestService _requestService = RequestService();
  List<dynamic> _requests = [];
  bool _isLoading = true;
  String _selectedStatus = 'All Status';
  final List<String> _statusOptions = [
    'All Status',
    'Pending',
    'Generated',
    'Rejected',
  ];

  @override
  void initState() {
    super.initState();
    _fetchRequests();
  }

  Future<void> _fetchRequests() async {
    setState(() => _isLoading = true);
    final result = await _requestService.getPayslipRequests(
      status: _selectedStatus,
    );
    if (mounted) {
      if (result['success']) {
        setState(() {
          _requests = result['data'];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  void _showRequestPayslipDialog() {
    showDialog(
      context: context,
      builder: (ctx) => RequestPayslipDialog(onSuccess: _fetchRequests),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Controls Row
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 0,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              DropdownButton<String>(
                value: _selectedStatus,
                items: _statusOptions
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedStatus = val);
                    _fetchRequests();
                  }
                },
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                onPressed: _showRequestPayslipDialog,
                icon: const Icon(Icons.add),
                label: const Text('Request Payslip'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),

        // List Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: Colors.grey[200],
          child: const Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  'Period',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 3,
                child: Text(
                  'Reason',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Status',
                  style: TextStyle(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
        ),

        // List Content
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _requests.isEmpty
              ? const Center(child: Text('No payslip requests found'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _requests.length,
                  separatorBuilder: (ctx, i) => const Divider(),
                  itemBuilder: (ctx, i) {
                    final req = _requests[i];
                    Color statusColor = Colors.grey;
                    if (req['status'] == 'Generated')
                      statusColor = AppColors.success;
                    else if (req['status'] == 'Rejected')
                      statusColor = AppColors.error;
                    else if (req['status'] == 'Pending')
                      statusColor = AppColors.warning;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: Text('${req['month']} ${req['year']}'),
                          ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              req['reason'] ?? '',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: statusColor),
                                ),
                                child: Text(
                                  req['status'],
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class RequestPayslipDialog extends StatefulWidget {
  final VoidCallback onSuccess;
  const RequestPayslipDialog({super.key, required this.onSuccess});

  @override
  State<RequestPayslipDialog> createState() => _RequestPayslipDialogState();
}

class _RequestPayslipDialogState extends State<RequestPayslipDialog> {
  final _formKey = GlobalKey<FormState>();
  final RequestService _requestService = RequestService();

  String _month = 'January';
  final TextEditingController _yearController = TextEditingController(
    text: DateTime.now().year.toString(),
  );
  final TextEditingController _reasonController = TextEditingController();
  bool _isSubmitting = false;

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

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final result = await _requestService.requestPayslip({
      'month': _month,
      'year': int.tryParse(_yearController.text) ?? DateTime.now().year,
      'reason': _reasonController.text.isNotEmpty
          ? _reasonController.text
          : null,
    });
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (result['success']) {
        widget.onSuccess();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payslip request submitted')),
        );
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: kDialogFormWidth,
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Request Payslip',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const Text(
                  'Request a payslip for a specific month',
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 20),

                const Text(
                  'Month',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                DropdownButtonFormField<String>(
                  value: _month,
                  items: _months
                      .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                      .toList(),
                  onChanged: (val) => setState(() => _month = val!),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                const Text(
                  'Year',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _yearController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Enter year',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  validator: (val) =>
                      val == null || val.isEmpty ? 'Year is required' : null,
                ),
                const SizedBox(height: 10),

                const Text(
                  'Reason (Optional)',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                TextFormField(
                  controller: _reasonController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Enter reason for payslip request',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: kButtonRadius,
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Submit Request'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
