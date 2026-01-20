// hrms/lib/screens/profile/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_colors.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_service.dart';
import '../../widgets/app_drawer.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  final AuthService _authService = AuthService();
  final OnboardingService _onboardingService = OnboardingService();
  Map<String, dynamic>? _userData;
  List<dynamic> _documents = [];
  bool _isLoading = true;
  bool _isLoadingDocs = false;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadProfile();
    _loadDocuments();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final result = await _authService.getProfile();
    if (mounted) {
      setState(() {
        if (result['success']) {
          _userData = result['data'];
          // Debug: Print the data structure
          print('=== PROFILE DATA ===');
          print('Profile: ${_userData?['profile']}');
          print('StaffData keys: ${_userData?['staffData']?.keys}');
          print('CandidateId: ${_userData?['staffData']?['candidateId']}');
          print(
            'Education: ${_userData?['staffData']?['candidateId']?['education']}',
          );
          print(
            'Experience: ${_userData?['staffData']?['candidateId']?['experience']}',
          );
          print('===================');
        } else {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(result['message'])));
        }
        _isLoading = false;
      });
    }
  }

  Map<String, dynamic>? get _profile => _userData?['profile'];
  Map<String, dynamic>? get _staffData => _userData?['staffData'];
  Map<String, dynamic>? get _candidateData =>
      _staffData?['candidateId'] as Map<String, dynamic>?;

  Future<void> _loadDocuments() async {
    setState(() => _isLoadingDocs = true);
    print('DEBUG: ProfileScreen._loadDocuments() called');
    final result = await _onboardingService.getMyOnboarding();
    if (mounted) {
      setState(() {
        print('DEBUG: API result success: ${result['success']}');
        if (result['success'] && result['data'] != null) {
          final data = result['data'];
          print('DEBUG: result[\'data\'] type: ${data.runtimeType}');
          print('DEBUG: result[\'data\'] content: $data');

          if (data is Map && data.containsKey('onboarding')) {
            final onboarding = data['onboarding'];
            print('DEBUG: onboarding type: ${onboarding.runtimeType}');

            if (onboarding is Map && onboarding.containsKey('documents')) {
              _documents = onboarding['documents'] as List? ?? [];
              print('DEBUG: _documents count: ${_documents.length}');
            } else {
              print('DEBUG: "documents" key missing in onboarding object');
              _documents = [];
            }
          } else {
            print('DEBUG: "onboarding" key missing in result[\'data\']');
            _documents = [];
          }
        } else {
          print(
            'DEBUG: Fetch failed or data null. result[\'message\']: ${result['message']}',
          );
          _documents = [];
        }
        _isLoadingDocs = false;
        print(
          'DEBUG: Finished _loadDocuments, _documents count: ${_documents.length}',
        );
      });
    }
  }

  Future<void> _viewDocument(String? url) async {
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document URL not available')),
      );
      return;
    }
    final Uri uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open document')),
        );
      }
    }
  }

  Future<void> _downloadDocument(String? url) async {
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document URL not available')),
      );
      return;
    }

    String downloadUrl = url;
    // For Cloudinary URLs, we can force download by adding fl_attachment
    if (url.contains('res.cloudinary.com')) {
      if (!url.contains('fl_attachment')) {
        // Find /upload/ and insert /fl_attachment/
        downloadUrl = url.replaceFirst('/upload/', '/upload/fl_attachment/');
      }
    }

    try {
      final Uri uri = Uri.parse(downloadUrl);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Starting download...'),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }

      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw 'Could not launch $downloadUrl';
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Download failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 22,
            color: Colors.white,
          ),
        ),
        backgroundColor: AppColors.primary,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            onPressed: () => _showEditProfileDialog(),
            icon: const Icon(Icons.edit_note, size: 28, color: Colors.white),
            tooltip: 'Edit Profile',
          ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white.withOpacity(0.7),
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelPadding: const EdgeInsets.symmetric(horizontal: 8),
          labelStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
          unselectedLabelStyle: const TextStyle(fontSize: 13),
          tabs: const [
            Tab(text: 'Personal'),
            Tab(text: 'Exp & Edu'),
            Tab(text: 'Documents'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _userData == null
          ? const Center(child: Text('Failed to load profile'))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildPersonalInfoTab(),
                _buildExpAndEduTab(),
                _buildDocumentsTab(),
              ],
            ),
    );
  }

  Widget _buildPersonalInfoTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          _buildHeaderCard(),
          const SizedBox(height: 24),
          _buildPersonalSection(),
          const SizedBox(height: 24),
          _buildIdentityAndBankSection(),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildHeaderCard() {
    final name = _profile?['name'] ?? 'User';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';
    final empId = _staffData?['employeeId'] ?? 'EMP-XXXX';
    final designation = _staffData?['designation'] ?? 'Employee';
    final status = _staffData?['status'] ?? 'Active';
    final email = _profile?['email'] ?? '';
    final phone = _profile?['phone'] ?? '';
    final dept = _staffData?['department'] ?? '';
    final joiningDate = _staffData?['joiningDate'];

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.white,
                  child: Text(
                    initial,
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      empId,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildHeaderBadge(
                          status,
                          Colors.white.withOpacity(0.2),
                        ),
                        if (joiningDate != null) ...[
                          const SizedBox(width: 8),
                          _buildHeaderBadge(
                            'Joined: ${_formatDate(joiningDate)}',
                            Colors.white.withOpacity(0.2),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      designation.toUpperCase(),
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.9),
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(color: Colors.white24),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildHeaderInfoItem(Icons.email_outlined, email),
              _buildHeaderInfoItem(Icons.phone_outlined, phone),
              _buildHeaderInfoItem(Icons.business_outlined, dept),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderInfoItem(IconData icon, String text) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(height: 4),
        Text(
          text,
          style: const TextStyle(color: Colors.white, fontSize: 10),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildHeaderBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white30),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        overflow: TextOverflow.ellipsis,
        maxLines: 1,
      ),
    );
  }

  Widget _buildPersonalSection() {
    return _buildCardSection(
      icon: Icons.person_outline,
      title: 'Personal Information',
      content: Column(
        children: [
          _buildInfoGrid([
            _buildInfoItem('Gender', _staffData?['gender'] ?? 'N/A'),
            _buildInfoItem('Date of Birth', _formatDate(_staffData?['dob'])),
          ]),
          const SizedBox(height: 20),
          _buildInfoGrid([
            _buildInfoItem(
              'Marital Status',
              _staffData?['maritalStatus'] ?? 'N/A',
            ),
            _buildInfoItem('Blood Group', _staffData?['bloodGroup'] ?? 'N/A'),
          ]),
          const SizedBox(height: 20),
          _buildInfoItem(
            'Current Address',
            '${_staffData?['address']?['line1'] ?? ''}, ${_staffData?['address']?['city'] ?? ''}, ${_staffData?['address']?['state'] ?? ''}',
          ),
        ],
      ),
    );
  }

  Widget _buildIdentityAndBankSection() {
    final empIds = _staffData?['employmentIds'] ?? {};
    final bank = _staffData?['bankDetails'] ?? {};

    return Column(
      children: [
        _buildCardSection(
          icon: Icons.badge_outlined,
          title: 'Employment IDs',
          content: Column(
            children: [
              _buildInfoGrid([
                _buildInfoItem('UAN Number', empIds['uan']),
                _buildInfoItem('PAN Number', empIds['pan']),
              ]),
              const SizedBox(height: 20),
              _buildInfoGrid([
                _buildInfoItem('Aadhaar Number', empIds['aadhaar']),
                _buildInfoItem('PF Number', empIds['pfNumber']),
              ]),
            ],
          ),
        ),
        const SizedBox(height: 24),
        _buildCardSection(
          icon: Icons.account_balance_outlined,
          title: 'Bank Details',
          content: Column(
            children: [
              _buildInfoGrid([
                _buildInfoItem('Bank Name', bank['bankName']),
                _buildInfoItem('Account Number', bank['accountNumber']),
              ]),
              const SizedBox(height: 20),
              _buildInfoGrid([
                _buildInfoItem('IFSC Code', bank['ifscCode']),
                _buildInfoItem('Holder Name', bank['accountHolderName']),
              ]),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildExpAndEduTab() {
    final education = _candidateData?['education'] as List? ?? [];
    final experience = _candidateData?['experience'] as List? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          _buildCardSection(
            icon: Icons.school_outlined,
            title: 'Education',
            content: education.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 30),
                      child: Text(
                        'No education details found.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                : Column(
                    children: education
                        .map(
                          (edu) => _buildEduItem(edu as Map<String, dynamic>),
                        )
                        .toList(),
                  ),
          ),
          const SizedBox(height: 24),
          _buildCardSection(
            icon: Icons.business_center_outlined,
            title: 'Experience',
            content: experience.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 30),
                      child: Text(
                        'No experience details found.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                : Column(
                    children: experience
                        .map(
                          (exp) => _buildExpItem(exp as Map<String, dynamic>),
                        )
                        .toList(),
                  ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildEduItem(Map<String, dynamic> edu) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.school, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  edu['qualification'] ?? 'N/A',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              if (edu['yearOfPassing'] != null)
                Text(
                  edu['yearOfPassing'].toString(),
                  style: TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoItem('Course', edu['courseName'] ?? edu['course']),
          const SizedBox(height: 12),
          _buildInfoItem('Institution', edu['institution']),
          const SizedBox(height: 12),
          _buildInfoGrid([
            _buildInfoItem('University', edu['university']),
            _buildInfoItem(
              'Score',
              edu['percentage'] ?? edu['cgpa'] ?? edu['score'],
            ),
          ]),
        ],
      ),
    );
  }

  Widget _buildExpItem(Map<String, dynamic> exp) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.work, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  exp['designation'] ?? exp['role'] ?? 'N/A',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoItem('Company', exp['company']),
          const SizedBox(height: 12),
          _buildInfoGrid([
            _buildInfoItem('From', _formatDate(exp['durationFrom'])),
            _buildInfoItem('To', _formatDate(exp['durationTo'])),
          ]),
          if (exp['keyResponsibilities'] != null &&
              exp['keyResponsibilities'].toString().isNotEmpty) ...[
            const SizedBox(height: 12),
            _buildInfoItem('Responsibilities', exp['keyResponsibilities']),
          ],
        ],
      ),
    );
  }

  Widget _buildDocumentsTab() {
    // Show loading while documents are being fetched
    if (_isLoadingDocs) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(20.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    // Use documents from onboarding service
    final docs = _documents;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: _buildCardSection(
        icon: Icons.description_outlined,
        title: 'Documents',
        showProgress: docs.isNotEmpty,
        content: docs.isEmpty
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 30),
                  child: Text(
                    'No documents found.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            : Column(
                children: docs
                    .map((doc) => _buildDocTile(doc as Map<String, dynamic>))
                    .toList(),
              ),
      ),
    );
  }

  Widget _buildDocTile(Map<String, dynamic> doc) {
    final status = doc['status'] ?? 'Pending';
    // API returns 'COMPLETED' for approved docs, also check 'Approved' for backward compatibility
    final isApproved = status == 'Approved' || status == 'COMPLETED';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.file_present_outlined,
              color: AppColors.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doc['name'] ?? doc['type'] ?? 'Document',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 4),
                _buildStatusBadge(
                  status,
                  isApproved ? Colors.green : Colors.orange,
                ),
              ],
            ),
          ),
          if (doc['url'] != null && doc['url'].toString().isNotEmpty) ...[
            IconButton(
              icon: const Icon(
                Icons.visibility_outlined,
                color: Colors.grey,
                size: 20,
              ),
              onPressed: () => _viewDocument(doc['url']),
              tooltip: 'View',
            ),
            IconButton(
              icon: Icon(
                Icons.download_outlined,
                color: AppColors.primary,
                size: 20,
              ),
              onPressed: () => _downloadDocument(doc['url']),
              tooltip: 'Download',
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildCardSection({
    required IconData icon,
    required String title,
    required Widget content,
    bool showProgress = false,
  }) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.grey.shade100, width: 1),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(icon, color: AppColors.primary, size: 22),
                    const SizedBox(width: 12),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                if (showProgress)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'COMPLETED 100%',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.green,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(padding: const EdgeInsets.all(20), child: content),
        ],
      ),
    );
  }

  Widget _buildInfoGrid(List<Widget> children) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children.map((c) => Expanded(child: c)).toList(),
    );
  }

  Widget _buildInfoItem(String label, dynamic value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value?.toString() ?? 'N/A',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'N/A';
    try {
      if (date is String) {
        return DateFormat('MMM dd, yyyy').format(DateTime.parse(date));
      }
      if (date is DateTime) return DateFormat('MMM dd, yyyy').format(date);
      return date.toString();
    } catch (e) {
      return date.toString();
    }
  }

  void _showEditProfileDialog() {
    final flattenedData = {..._profile ?? {}, ..._staffData ?? {}};

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      builder: (context) => _EditProfileSheet(
        userData: flattenedData,
        onSave: (updatedData) async {
          final result = await _authService.updateProfile(updatedData);
          if (result['success']) {
            _loadProfile();
            if (context.mounted) Navigator.pop(context);
          } else {
            if (context.mounted) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text(result['message'])));
            }
          }
        },
      ),
    );
  }
}

class _EditProfileSheet extends StatefulWidget {
  final Map<String, dynamic> userData;
  final Function(Map<String, dynamic>) onSave;

  const _EditProfileSheet({required this.userData, required this.onSave});

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _genderController;
  late TextEditingController _dobController;
  late TextEditingController _maritalStatusController;
  late TextEditingController _bloodGroupController;
  late TextEditingController _addrLine1Controller;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _bankNameController;
  late TextEditingController _accNumController;
  late TextEditingController _ifscController;
  late TextEditingController _holderController;
  late TextEditingController _upiController;
  late TextEditingController _uanController;
  late TextEditingController _panController;
  late TextEditingController _aadhaarController;
  late TextEditingController _pfController;
  late TextEditingController _esiController;
  late TextEditingController _designationController;
  late TextEditingController _deptController;
  late TextEditingController _statusController;

  @override
  void initState() {
    super.initState();
    final d = widget.userData;
    _nameController = TextEditingController(text: d['name']);
    _phoneController = TextEditingController(text: d['phone']);
    _genderController = TextEditingController(text: d['gender']);
    _dobController = TextEditingController(
      text: d['dob'] != null ? d['dob'].toString().split('T')[0] : '',
    );
    _maritalStatusController = TextEditingController(text: d['maritalStatus']);
    _bloodGroupController = TextEditingController(text: d['bloodGroup']);
    _addrLine1Controller = TextEditingController(text: d['address']?['line1']);
    _cityController = TextEditingController(text: d['address']?['city']);
    _stateController = TextEditingController(text: d['address']?['state']);
    _bankNameController = TextEditingController(
      text: d['bankDetails']?['bankName'],
    );
    _accNumController = TextEditingController(
      text: d['bankDetails']?['accountNumber'],
    );
    _ifscController = TextEditingController(
      text: d['bankDetails']?['ifscCode'],
    );
    _holderController = TextEditingController(
      text: d['bankDetails']?['accountHolderName'],
    );
    _upiController = TextEditingController(text: d['bankDetails']?['upiId']);
    _uanController = TextEditingController(text: d['uan']);
    _panController = TextEditingController(text: d['pan']);
    _aadhaarController = TextEditingController(text: d['aadhaar']);
    _pfController = TextEditingController(text: d['pfNumber']);
    _esiController = TextEditingController(text: d['esiNumber']);
    _designationController = TextEditingController(text: d['designation']);
    _deptController = TextEditingController(text: d['department']);
    _statusController = TextEditingController(text: d['status']);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _genderController.dispose();
    _dobController.dispose();
    _maritalStatusController.dispose();
    _bloodGroupController.dispose();
    _addrLine1Controller.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _bankNameController.dispose();
    _accNumController.dispose();
    _ifscController.dispose();
    _holderController.dispose();
    _upiController.dispose();
    _uanController.dispose();
    _panController.dispose();
    _aadhaarController.dispose();
    _pfController.dispose();
    _esiController.dispose();
    _designationController.dispose();
    _deptController.dispose();
    _statusController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Edit Profile',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, size: 28),
                ),
              ],
            ),
            const Divider(),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    _buildSectionTitle('Personal Information'),
                    _buildTextField(_nameController, 'Full Name', Icons.person),
                    _buildTextField(_phoneController, 'Phone', Icons.phone),
                    Row(
                      children: [
                        Expanded(
                          child: _buildTextField(
                            _genderController,
                            'Gender',
                            Icons.group,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildTextField(
                            _dobController,
                            'DOB (YYYY-MM-DD)',
                            Icons.calendar_today,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Expanded(
                          child: _buildTextField(
                            _maritalStatusController,
                            'Marital Status',
                            Icons.favorite,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildTextField(
                            _bloodGroupController,
                            'Blood Group',
                            Icons.bloodtype,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildSectionTitle('Professional Details'),
                    _buildTextField(
                      _designationController,
                      'Designation',
                      Icons.work,
                    ),
                    _buildTextField(
                      _deptController,
                      'Department',
                      Icons.business,
                    ),
                    _buildTextField(_statusController, 'Status', Icons.info),
                    const SizedBox(height: 24),
                    _buildSectionTitle('Address'),
                    _buildTextField(
                      _addrLine1Controller,
                      'Address Line 1',
                      Icons.location_on,
                    ),
                    Row(
                      children: [
                        Expanded(
                          child: _buildTextField(
                            _cityController,
                            'City',
                            Icons.location_city,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildTextField(
                            _stateController,
                            'State',
                            Icons.map,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildSectionTitle('Bank Details'),
                    _buildTextField(
                      _bankNameController,
                      'Bank Name',
                      Icons.account_balance,
                    ),
                    _buildTextField(
                      _accNumController,
                      'Account Number',
                      Icons.numbers,
                    ),
                    _buildTextField(_ifscController, 'IFSC Code', Icons.code),
                    _buildTextField(
                      _holderController,
                      'Holder Name',
                      Icons.badge,
                    ),
                    _buildTextField(_upiController, 'UPI ID', Icons.payment),
                    const SizedBox(height: 24),
                    _buildSectionTitle('Employment IDs'),
                    _buildTextField(_uanController, 'UAN', Icons.numbers),
                    _buildTextField(_panController, 'PAN', Icons.credit_card),
                    _buildTextField(
                      _aadhaarController,
                      'Aadhaar',
                      Icons.fingerprint,
                    ),
                    _buildTextField(_pfController, 'PF Number', Icons.numbers),
                    _buildTextField(
                      _esiController,
                      'ESI Number',
                      Icons.numbers,
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      widget.onSave({
                        'name': _nameController.text,
                        'phone': _phoneController.text,
                        'gender': _genderController.text,
                        'maritalStatus': _maritalStatusController.text,
                        'dob': _dobController.text,
                        'bloodGroup': _bloodGroupController.text,
                        'designation': _designationController.text,
                        'department': _deptController.text,
                        'status': _statusController.text,
                        'address': {
                          'line1': _addrLine1Controller.text,
                          'city': _cityController.text,
                          'state': _stateController.text,
                        },
                        'bankDetails': {
                          'bankName': _bankNameController.text,
                          'accountNumber': _accNumController.text,
                          'ifscCode': _ifscController.text,
                          'accountHolderName': _holderController.text,
                          'upiId': _upiController.text,
                        },
                        'uan': _uanController.text,
                        'pan': _panController.text,
                        'aadhaar': _aadhaarController.text,
                        'pfNumber': _pfController.text,
                        'esiNumber': _esiController.text,
                      });
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 4,
                  ),
                  child: const Text(
                    'Save All Changes',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.grey[600],
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    IconData icon,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: TextFormField(
        controller: controller,
        style: const TextStyle(fontWeight: FontWeight.w500),
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 22, color: AppColors.primary),
          labelStyle: const TextStyle(color: Colors.grey),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: AppColors.primary, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),
      ),
    );
  }
}
