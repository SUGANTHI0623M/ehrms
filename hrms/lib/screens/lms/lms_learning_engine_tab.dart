// hrms/lib/screens/lms/lms_learning_engine_tab.dart
// Learning Engine tab - mirrors web Learning Engine section
// Stats: My completion, Courses completed, Active courses
// Learning consistency heatmap (simplified), Recent progress

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_colors.dart';
import '../../services/lms_service.dart';

class LmsLearningEngineTab extends StatefulWidget {
  final VoidCallback? onRefresh;

  const LmsLearningEngineTab({super.key, this.onRefresh});

  @override
  State<LmsLearningEngineTab> createState() => _LmsLearningEngineTabState();
}

class _LmsLearningEngineTabState extends State<LmsLearningEngineTab> {
  final LmsService _lmsService = LmsService();
  bool _scoresLoading = true;
  bool _heatmapLoading = true;
  Map<String, dynamic>? _scoresData;
  List<dynamic> _heatmap = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _scoresLoading = true;
      _heatmapLoading = true;
    });
    final scoresRes = await _lmsService.getMyScores();
    final heatmapRes = await _lmsService.getLearningEngine();
    if (mounted) {
      setState(() {
        _scoresLoading = false;
        _heatmapLoading = false;
        _scoresData = scoresRes['data'];
        _heatmap = (heatmapRes['heatmap'] as List?) ?? [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _scoresData?['summary'] ?? {};
    final courses = (_scoresData?['courses'] as List?) ?? [];
    final totalCourses = summary['totalCourses'] ?? 0;
    final completedCourses = summary['completedCourses'] ?? 0;
    final inProgress = summary['inProgress'] ?? 0;
    final myCompletion = totalCourses > 0
        ? ((completedCourses / totalCourses) * 100).round()
        : 0;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Learning Engine',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Track progress and stay consistent.',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    title: 'MY COMPLETION',
                    value: _scoresLoading ? '—' : '$myCompletion%',
                    icon: Icons.check_circle_outline,
                    color: Colors.green,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    title: 'COURSES COMPLETED',
                    value: _scoresLoading
                        ? '—'
                        : '$completedCourses/$totalCourses',
                    icon: Icons.menu_book_outlined,
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    title: 'ACTIVE COURSES',
                    value: _scoresLoading ? '—' : '$inProgress',
                    icon: Icons.local_fire_department_outlined,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.calendar_today,
                          size: 20,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Learning consistency',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_heatmapLoading)
                      const Center(child: CircularProgressIndicator())
                    else if (_heatmap.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: Text(
                            'No learning activity yet',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ),
                      )
                    else
                      _buildHeatmapGrid(),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          'Less',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        ..._heatColors.asMap().entries.map(
                          (e) => Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: Container(
                              width: 14,
                              height: 14,
                              decoration: BoxDecoration(
                                color: e.value,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'More',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            _buildQuizPerformanceCard(),
            const SizedBox(height: 24),
            const Text(
              'Recent progress',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
            const SizedBox(height: 12),
            if (courses.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'No courses assigned yet',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ),
                ),
              )
            else
              ...courses
                  .take(6)
                  .map(
                    (c) => _RecentProgressItem(
                      title: c['title'] ?? 'Course',
                      progress: c['progress'] ?? 0,
                      status: c['status'] ?? 'Not Started',
                    ),
                  ),
            const SizedBox(height: 24),
            _buildUpcomingDeadlines(),
          ],
        ),
      ),
    );
  }

  Widget _buildQuizPerformanceCard() {
    final quizStats = _scoresData?['quizStats'] as Map<String, dynamic>?;
    if (_scoresLoading) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
        ),
      );
    }
    final totalAssigned = quizStats?['totalAssigned'] ?? 0;
    final totalCompleted = quizStats?['totalCompleted'] ?? 0;
    final completionPercent = quizStats?['completionPercent'] ?? 0;
    final easy = quizStats?['easy'] as Map<String, dynamic>? ?? {};
    final medium = quizStats?['medium'] as Map<String, dynamic>? ?? {};
    final hard = quizStats?['hard'] as Map<String, dynamic>? ?? {};

    if (totalAssigned == 0) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Icon(
                Icons.emoji_events_outlined,
                size: 48,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 12),
              Text(
                'No quizzes assigned yet. Complete lessons in your courses to unlock practice quizzes.',
                style: TextStyle(color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.emoji_events, color: Colors.amber[700]),
                const SizedBox(width: 8),
                const Text(
                  'Quiz performance',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                SizedBox(
                  width: 90,
                  height: 90,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: completionPercent / 100,
                        strokeWidth: 8,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$totalCompleted',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'of $totalAssigned',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    children: [
                      _QuizDifficultyRow(
                        label: 'Easy',
                        completed: easy['completed'] ?? 0,
                        total: easy['total'] ?? 0,
                        percent: easy['percent'] ?? 0,
                        color: Colors.green,
                      ),
                      const SizedBox(height: 8),
                      _QuizDifficultyRow(
                        label: 'Medium',
                        completed: medium['completed'] ?? 0,
                        total: medium['total'] ?? 0,
                        percent: medium['percent'] ?? 0,
                        color: Colors.amber,
                      ),
                      const SizedBox(height: 8),
                      _QuizDifficultyRow(
                        label: 'Hard',
                        completed: hard['completed'] ?? 0,
                        total: hard['total'] ?? 0,
                        percent: hard['percent'] ?? 0,
                        color: Colors.red,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUpcomingDeadlines() {
    final courses = (_scoresData?['courses'] as List?) ?? [];
    final deadlines =
        courses
            .where((c) => c['dueDate'] != null && c['status'] != 'Completed')
            .map((c) => {...c, 'daysRemaining': c['daysRemaining'] ?? 0})
            .toList()
          ..sort(
            (a, b) => (a['daysRemaining'] ?? 999).compareTo(
              b['daysRemaining'] ?? 999,
            ),
          );

    final top5 = deadlines.take(5).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.schedule, size: 20, color: Colors.grey[600]),
            const SizedBox(width: 8),
            const Text(
              'Upcoming deadlines',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (top5.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No upcoming deadlines',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ),
            ),
          )
        else
          ...top5.map((c) {
            final days = c['daysRemaining'] ?? 0;
            final urgency = days < 0 ? 'overdue' : (days <= 7 ? 'soon' : 'ok');
            final bg = urgency == 'overdue'
                ? Colors.red.withOpacity(0.1)
                : (urgency == 'soon'
                      ? Colors.amber.withOpacity(0.1)
                      : Colors.green.withOpacity(0.1));
            final border = urgency == 'overdue'
                ? Colors.red
                : (urgency == 'soon' ? Colors.amber : Colors.green);

            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: BorderSide(color: border.withOpacity(0.5)),
              ),
              color: bg,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        c['title'] ?? 'Course',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (c['dueDate'] != null)
                      Text(
                        _formatDate(c['dueDate']),
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    const SizedBox(width: 8),
                    Text(
                      days < 0
                          ? '${-days}d overdue'
                          : days == 0
                          ? 'Due today'
                          : '${days}d left',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: border,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return '—';
    try {
      final d = date is DateTime ? date : DateTime.tryParse(date.toString());
      if (d == null) return '—';
      return '${d.day} ${_monthShort(d.month)} ${d.year}';
    } catch (_) {
      return '—';
    }
  }

  String _monthShort(int m) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[m - 1];
  }

  static const _heatColors = [
    Color(0xFFebedf0),
    Color(0xFF9be9a8),
    Color(0xFF40c463),
    Color(0xFF30a14e),
    Color(0xFF216e39),
  ];

  Widget _buildHeatmapGrid() {
    final now = DateTime.now();
    final start = now.subtract(const Duration(days: 83));
    final cells = <String, int>{};
    for (final h in _heatmap) {
      final date = h['date']?.toString();
      if (date != null) {
        final score = h['activityScore'] ?? h['totalMinutes'] ?? 0;
        int level = 0;
        if (score > 60)
          level = 4;
        else if (score > 40)
          level = 3;
        else if (score > 20)
          level = 2;
        else if (score > 0)
          level = 1;
        cells[date] = level;
      }
    }
    const cols = 12;
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(cols, (col) {
              final d = start.add(Duration(days: col * 7));
              return SizedBox(
                width: 24,
                child: Center(
                  child: Text(
                    DateFormat('MMM').format(d),
                    style: TextStyle(fontSize: 9, color: Colors.grey[600]),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 4),
          ...List.generate(7, (row) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Row(
                children: [
                  SizedBox(
                    width: 28,
                    child: Text(
                      labels[row],
                      style: TextStyle(fontSize: 9, color: Colors.grey[600]),
                    ),
                  ),
                  Row(
                    children: List.generate(cols, (col) {
                      final dayOffset = col * 7 + row;
                      final d = start.add(Duration(days: dayOffset));
                      if (d.isAfter(now)) {
                        return const SizedBox(width: 20, height: 20);
                      }
                      final key = DateFormat('yyyy-MM-dd').format(d);
                      final level = cells[key] ?? 0;
                      return Container(
                        width: 18,
                        height: 18,
                        margin: const EdgeInsets.only(right: 2),
                        decoration: BoxDecoration(
                          color: _heatColors[level],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      );
                    }),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _QuizDifficultyRow extends StatelessWidget {
  final String label;
  final int completed;
  final int total;
  final int percent;
  final Color color;

  const _QuizDifficultyRow({
    required this.label,
    required this.completed,
    required this.total,
    required this.percent,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
          Text(
            '$completed/$total',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              '$percent%',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RecentProgressItem extends StatelessWidget {
  final String title;
  final int progress;
  final String status;

  const _RecentProgressItem({
    required this.title,
    required this.progress,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w500),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            SizedBox(
              width: 80,
              child: LinearProgressIndicator(
                value: progress / 100,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation<Color>(
                  status == 'Completed' ? Colors.green : AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 80,
              child: Text(
                status == 'Completed' ? 'Completed' : 'In Progress',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
