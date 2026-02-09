// hrms/lib/screens/lms/lms_live_sessions_screen.dart
// My Live Sessions - mirrors web /lms/employee/live-sessions
// Tabs: Upcoming, Ended. Schedule Session modal.

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_colors.dart';
import '../../services/lms_service.dart';
import '../../widgets/bottom_navigation_bar.dart';
import '../dashboard/dashboard_screen.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/menu_icon_button.dart';
import '../../utils/snackbar_utils.dart' show SnackBarUtils;

class LmsLiveSessionsScreen extends StatefulWidget {
  /// When true, rendered inside LmsShellScreen (no Scaffold, app bar, drawer).
  final bool embeddedInShell;

  const LmsLiveSessionsScreen({super.key, this.embeddedInShell = false});

  @override
  State<LmsLiveSessionsScreen> createState() => _LmsLiveSessionsScreenState();
}

class _LmsLiveSessionsScreenState extends State<LmsLiveSessionsScreen>
    with SingleTickerProviderStateMixin {
  final LmsService _lmsService = LmsService();
  late TabController _tabController;

  List<dynamic> _sessions = [];
  bool _isLoading = true;
  List<dynamic> _departments = [];
  List<dynamic> _employees = [];
  bool _metaLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadSessions();
    _loadMeta();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSessions() async {
    setState(() => _isLoading = true);
    final res = await _lmsService.getMySessions();
    if (mounted) {
      setState(() {
        _isLoading = false;
        _sessions = (res['data'] as List?) ?? [];
      });
    }
  }

  Future<void> _loadMeta() async {
    setState(() => _metaLoading = true);
    final deptRes = await _lmsService.getDepartments();
    final empRes = await _lmsService.getEmployees();
    if (mounted) {
      setState(() {
        _metaLoading = false;
        _departments = (deptRes['data']?['departments'] as List?) ?? [];
        _employees = (empRes['data']?['staff'] as List?) ?? [];
      });
    }
  }

  List<dynamic> get _upcomingSessions {
    final now = DateTime.now();
    return _sessions.where((s) {
      final dt = s['dateTime'];
      if (dt == null) return false;
      final d = dt is DateTime ? dt : DateTime.tryParse(dt.toString());
      if (d == null) return false;
      final end = d.add(Duration(minutes: s['duration'] ?? 60));
      return end.isAfter(now);
    }).toList();
  }

  List<dynamic> get _endedSessions {
    final now = DateTime.now();
    return _sessions.where((s) {
      final dt = s['dateTime'];
      if (dt == null) return true;
      final d = dt is DateTime ? dt : DateTime.tryParse(dt.toString());
      if (d == null) return true;
      final end = d.add(Duration(minutes: s['duration'] ?? 60));
      return end.isBefore(now) || end.isAtSameMomentAs(now);
    }).toList();
  }

  String _getStatus(dynamic session) {
    final dt = session['dateTime'];
    if (dt == null) return 'Upcoming';
    final d = dt is DateTime ? dt : DateTime.tryParse(dt.toString());
    if (d == null) return 'Upcoming';
    final now = DateTime.now();
    final end = d.add(Duration(minutes: session['duration'] ?? 60));
    if (now.isBefore(d)) return 'Upcoming';
    if (now.isBefore(end) || now.isAtSameMomentAs(end)) return 'Live Now';
    return 'Ended';
  }

  @override
  Widget build(BuildContext context) {
    final tabBar = TabBar(
      controller: _tabController,
      labelColor: AppColors.primary,
      unselectedLabelColor: Colors.black87,
      indicatorColor: AppColors.primary,
      indicatorSize: TabBarIndicatorSize.tab,
      labelPadding: const EdgeInsets.symmetric(horizontal: 8),
      indicator: BoxDecoration(
        color: AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      tabs: const [
        Tab(text: 'Upcoming', icon: Icon(Icons.event_outlined, size: 20)),
        Tab(text: 'Ended', icon: Icon(Icons.check_circle_outline, size: 20)),
      ],
    );

    final body = TabBarView(
      controller: _tabController,
      children: [
        _buildSessionList(_upcomingSessions),
        _buildSessionList(_endedSessions),
      ],
    );

    if (widget.embeddedInShell) {
      return Column(
        children: [
          Container(
            color: AppColors.surface,
            child: tabBar,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _isLoading ? null : _loadSessions,
                ),
                ElevatedButton.icon(
                  onPressed: () => _showScheduleModal(context),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Schedule Session'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
              ],
            ),
          ),
          Expanded(child: body),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        leading: const MenuIconButton(),
        title: const Text('My Live Sessions', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadSessions,
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ElevatedButton.icon(
              onPressed: () => _showScheduleModal(context),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Schedule Session'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(color: AppColors.surface, child: tabBar),
        ),
      ),
      drawer: const AppDrawer(),
      body: body,
      bottomNavigationBar: AppBottomNavigationBar(
        currentIndex: 0,
        onTap: (index) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => DashboardScreen(initialIndex: index)),
            (route) => route.isFirst,
          );
        },
      ),
    );
  }

  Widget _buildSessionList(List<dynamic> sessions) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadSessions,
      child: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Join interactive classrooms. Tap a session to see details.',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          ),
          if (sessions.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.video_call_outlined,
                      size: 64,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No sessions',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final session = sessions[index];
                return _SessionCard(
                  session: session,
                  status: _getStatus(session),
                  onJoin: () => _joinSession(session),
                  onEdit: () => _showScheduleModal(context, session: session),
                  onDelete: () => _deleteSession(session),
                );
              }, childCount: sessions.length),
            ),
        ],
      ),
    );
  }

  Future<void> _joinSession(dynamic session) async {
    final link = session['meetingLink']?.toString();
    if (link != null && link.isNotEmpty) {
      final uri = Uri.tryParse(link);
      if (uri != null && await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        SnackBarUtils.showSnackBar(
          context,
          'Failed to open meeting link',
          isError: true,
        );
      }
    }
    await _lmsService.joinSession(session['_id']);
  }

  Future<void> _deleteSession(dynamic session) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete session?'),
        content: Text('Remove "${session['title']}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final res = await _lmsService.deleteSession(session['_id']);
    if (mounted) {
      if (res['success'] == true) {
        SnackBarUtils.showSnackBar(context, 'Session deleted');
        _loadSessions();
      } else {
        SnackBarUtils.showSnackBar(
          context,
          res['message'] ?? 'Delete failed',
          isError: true,
        );
      }
    }
  }

  void _showScheduleModal(BuildContext context, {dynamic session}) {
    final isEdit = session != null;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _ScheduleSessionSheet(
        session: session,
        departments: _departments,
        employees: _employees,
        onSaved: () {
          Navigator.pop(ctx);
          _loadSessions();
        },
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  final dynamic session;
  final String status;
  final VoidCallback onJoin;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _SessionCard({
    required this.session,
    required this.status,
    required this.onJoin,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final dt = session['dateTime'];
    DateTime? d;
    if (dt != null) {
      d = dt is DateTime ? dt : DateTime.tryParse(dt.toString());
    }
    final assignedAt = session['createdAt'] ?? session['assignedAt'];
    DateTime? assignedDate;
    if (assignedAt != null) {
      assignedDate = assignedAt is DateTime
          ? assignedAt
          : DateTime.tryParse(assignedAt.toString());
    }

    final host =
        session['trainerName'] ?? session['trainerId']?['name'] ?? 'Host';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    session['title'] ?? 'Session',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: status == 'Live Now'
                        ? Colors.green
                        : status == 'Upcoming'
                        ? Colors.blue
                        : Colors.grey,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: onEdit,
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: onDelete,
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (d != null)
              Row(
                children: [
                  const Icon(Icons.schedule, size: 16),
                  const SizedBox(width: 8),
                  Text(DateFormat('d MMM yyyy · h:mm a').format(d)),
                ],
              ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 16),
                const SizedBox(width: 8),
                Text(host),
                const SizedBox(width: 16),
                Text('${session['duration'] ?? 60} min'),
              ],
            ),
            if (status == 'Live Now' || status == 'Upcoming') ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: onJoin,
                  icon: const Icon(Icons.video_call),
                  label: Text(status == 'Live Now' ? 'Join Now' : 'Join'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ScheduleSessionSheet extends StatefulWidget {
  final dynamic session;
  final List<dynamic> departments;
  final List<dynamic> employees;
  final VoidCallback onSaved;

  const _ScheduleSessionSheet({
    this.session,
    required this.departments,
    required this.employees,
    required this.onSaved,
  });

  @override
  State<_ScheduleSessionSheet> createState() => _ScheduleSessionSheetState();
}

class _ScheduleSessionSheetState extends State<_ScheduleSessionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _agendaController = TextEditingController();
  final _meetingLinkController = TextEditingController();
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  int _duration = 60;
  String _sessionType = 'Normal Session';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.session != null) {
      final s = widget.session;
      _titleController.text = s['title'] ?? '';
      _agendaController.text = s['agenda'] ?? '';
      _meetingLinkController.text = s['meetingLink'] ?? '';
      _duration = s['duration'] ?? 60;
      _sessionType = s['category'] ?? 'Normal Session';
      final dt = s['dateTime'];
      if (dt != null) {
        final d = dt is DateTime ? dt : DateTime.tryParse(dt.toString());
        if (d != null) {
          _selectedDate = d;
          _selectedTime = TimeOfDay(hour: d.hour, minute: d.minute);
        }
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _agendaController.dispose();
    _meetingLinkController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDate == null || _selectedTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select date and time')),
      );
      return;
    }

    final combined = DateTime(
      _selectedDate!.year,
      _selectedDate!.month,
      _selectedDate!.day,
      _selectedTime!.hour,
      _selectedTime!.minute,
    );

    setState(() => _saving = true);

    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    String? userId;
    if (userStr != null) {
      try {
        final user = jsonDecode(userStr) as Map<String, dynamic>?;
        userId = user?['_id']?.toString();
      } catch (_) {}
    }

    final payload = {
      'title': _titleController.text.trim(),
      'agenda': _agendaController.text.trim(),
      'meetingLink': _meetingLinkController.text.trim(),
      'dateTime': combined.toIso8601String(),
      'duration': _duration,
      'category': _sessionType,
      'assignmentType': 'All',
    };

    final lmsService = LmsService();
    Map<String, dynamic> res;
    if (widget.session != null) {
      res = await lmsService.updateSession(widget.session!['_id'], payload);
    } else {
      res = await lmsService.createSession(payload);
    }

    if (mounted) {
      setState(() => _saving = false);
      if (res['success'] == true) {
        SnackBarUtils.showSnackBar(
          context,
          widget.session != null ? 'Session updated' : 'Session scheduled',
        );
        widget.onSaved();
      } else {
        SnackBarUtils.showSnackBar(
          context,
          res['message'] ?? 'Failed',
          isError: true,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      expand: false,
      builder: (context, scrollController) {
        return SingleChildScrollView(
          controller: scrollController,
          child: Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            ),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 16),
                  const Text(
                    'Schedule Live Session',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Create and manage external meetings',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(
                      labelText: 'Session Title *',
                      hintText: 'e.g. Q3 Sales Strategy',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _sessionType,
                    decoration: const InputDecoration(
                      labelText: 'Session Type',
                      border: OutlineInputBorder(),
                    ),
                    items: ['Normal Session', 'Training', 'Assessment']
                        .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                        .toList(),
                    onChanged: (v) =>
                        setState(() => _sessionType = v ?? 'Normal Session'),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _agendaController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Agenda',
                      hintText: 'e.g. 1. Intro 2. Demo 3. Q&A',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _meetingLinkController,
                    decoration: const InputDecoration(
                      labelText: 'Meeting Link *',
                      hintText: 'https://meet.google.com/...',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final date = await showDatePicker(
                              context: context,
                              initialDate: _selectedDate ?? DateTime.now(),
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(
                                const Duration(days: 365),
                              ),
                            );
                            if (date != null)
                              setState(() => _selectedDate = date);
                          },
                          icon: const Icon(Icons.calendar_today),
                          label: Text(
                            _selectedDate != null
                                ? DateFormat(
                                    'dd MMM yyyy',
                                  ).format(_selectedDate!)
                                : 'Select date',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: _selectedTime ?? TimeOfDay.now(),
                            );
                            if (time != null)
                              setState(() => _selectedTime = time);
                          },
                          icon: const Icon(Icons.access_time),
                          label: Text(
                            _selectedTime != null
                                ? _selectedTime!.format(context)
                                : 'Select time',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Text('Duration (minutes):'),
                      const SizedBox(width: 12),
                      DropdownButton<int>(
                        value: _duration,
                        items: [30, 60, 90, 120]
                            .map(
                              (e) => DropdownMenuItem(
                                value: e,
                                child: Text('$e min'),
                              ),
                            )
                            .toList(),
                        onChanged: (v) => setState(() => _duration = v ?? 60),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving
                              ? null
                              : () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _saving ? null : _save,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: _saving
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Schedule Session'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
