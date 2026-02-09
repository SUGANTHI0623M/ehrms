// hrms/lib/screens/lms/lms_ai_quiz_attempt_screen.dart
// AI Practice Quiz attempt - mirrors web /lms/ai-quiz/attempt/:quizId

import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../services/lms_service.dart';
import '../../utils/snackbar_utils.dart' show SnackBarUtils;
import 'lms_course_detail_screen.dart';
import 'lms_dashboard_screen.dart';

class LmsAiQuizAttemptScreen extends StatefulWidget {
  final String quizId;

  const LmsAiQuizAttemptScreen({super.key, required this.quizId});

  @override
  State<LmsAiQuizAttemptScreen> createState() => _LmsAiQuizAttemptScreenState();
}

class _LmsAiQuizAttemptScreenState extends State<LmsAiQuizAttemptScreen> {
  final LmsService _lmsService = LmsService();
  dynamic _quiz;
  bool _loading = true;
  int _currentIndex = 0;
  final Map<int, String> _answers = {};
  bool _isFinished = false;
  Map<String, dynamic>? _results;
  final DateTime _startTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadQuiz();
  }

  Future<void> _loadQuiz() async {
    setState(() => _loading = true);
    final res = await _lmsService.getAIQuiz(widget.quizId);
    if (mounted) {
      setState(() {
        _loading = false;
        _quiz = res['data'];
      });
    }
  }

  Future<void> _submit() async {
    final questions = (_quiz?['questions'] as List?) ?? [];
    if (_answers.length < questions.length) {
      SnackBarUtils.showSnackBar(
        context,
        'Please answer all questions before submitting.',
        isError: true,
      );
      return;
    }

    final responses = <Map<String, dynamic>>[];
    for (var i = 0; i < questions.length; i++) {
      responses.add({'questionIndex': i, 'answer': _answers[i] ?? ''});
    }

    final completionTime = DateTime.now().difference(_startTime).inSeconds;
    final res = await _lmsService.submitAIQuiz(
      widget.quizId,
      responses: responses,
      completionTime: completionTime,
    );

    if (mounted) {
      if (res['success'] == true && res['data'] != null) {
        setState(() {
          _isFinished = true;
          _results = res['data'] as Map<String, dynamic>;
        });
        SnackBarUtils.showSnackBar(context, 'Practice complete!');
      } else {
        SnackBarUtils.showSnackBar(
          context,
          res['message'] ?? 'Failed to submit',
          isError: true,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
          title: const Text('Practice Quiz'),
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.textPrimary,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_quiz == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
          title: const Text('Quiz'),
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.textPrimary,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Quiz not found'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back'),
              ),
            ],
          ),
        ),
      );
    }

    if (_isFinished && _results != null) {
      return _buildResultsView();
    }

    final questions = (_quiz['questions'] as List?) ?? [];
    if (questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
          title: const Text('Quiz'),
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.textPrimary,
        ),
        body: const Center(child: Text('No questions available')),
      );
    }

    final current = questions[_currentIndex] as Map<String, dynamic>?;
    if (current == null) return const SizedBox();

    final progress = ((_currentIndex + 1) / questions.length) * 100;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
        title: const Text('Practice Quiz'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LinearProgressIndicator(
              value: progress / 100,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
            const SizedBox(height: 8),
            Text(
              'Question ${_currentIndex + 1} of ${questions.length}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            Text(
              current['question'] ?? 'Question',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 24),
            ..._buildOptions(current),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_currentIndex > 0)
                  Material(
                    color: AppColors.primary,
                    shape: const CircleBorder(),
                    child: IconButton(
                      onPressed: () => setState(() => _currentIndex--),
                      icon: const Icon(Icons.arrow_back),
                      color: Colors.white,
                      iconSize: 22,
                    ),
                  )
                else
                  const SizedBox(width: 48),
                Material(
                  color: AppColors.primary,
                  shape: const CircleBorder(),
                  child: IconButton(
                    onPressed: () {
                      if (_currentIndex < questions.length - 1) {
                        setState(() => _currentIndex++);
                      } else {
                        _submit();
                      }
                    },
                    icon: Icon(
                      _currentIndex < questions.length - 1
                          ? Icons.arrow_forward
                          : Icons.check,
                      size: 22,
                    ),
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildOptions(Map<String, dynamic> question) {
    final options = question['options'] as List? ?? [];
    final selected = _answers[_currentIndex];

    if (options.isEmpty) {
      return [
        TextField(
          decoration: const InputDecoration(
            labelText: 'Your answer',
            border: OutlineInputBorder(),
          ),
          onChanged: (v) => _answers[_currentIndex] = v,
        ),
      ];
    }

    return options.map<Widget>((opt) {
      final val = opt.toString();
      final isSelected = selected == val;
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          onTap: () => setState(() => _answers[_currentIndex] = val),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppColors.primary.withOpacity(0.1)
                  : Colors.grey[50],
              border: Border.all(
                color: isSelected ? AppColors.primary : Colors.grey[300]!,
                width: isSelected ? 2 : 1,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  isSelected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                  color: isSelected ? AppColors.primary : Colors.grey,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(val)),
              ],
            ),
          ),
        ),
      );
    }).toList();
  }

  Widget _buildResultsView() {
    final score = _results!['score'] ?? 0;
    final totalPoints = _results!['totalPoints'] ?? 0;
    final passed = _results!['passed'] ?? false;
    final percentage = totalPoints > 0
        ? ((score / totalPoints) * 100).round()
        : 0;
    final c = _quiz?['courseId'];
    final courseId = c is Map ? c['_id']?.toString() : c?.toString();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
        title: const Text('Quiz Complete'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 24),
            Icon(
              Icons.emoji_events,
              size: 64,
              color: passed ? Colors.amber : Colors.grey,
            ),
            const SizedBox(height: 16),
            const Text(
              'Knowledge Review Complete',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _resultCard(
                  'Proficiency',
                  '$percentage%',
                  passed ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 16),
                _resultCard('Score', '$score/$totalPoints', AppColors.primary),
              ],
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (courseId != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (_) =>
                              LmsCourseDetailScreen(courseId: courseId),
                        ),
                        (r) => r.isFirst,
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Back to Course'),
                    ),
                  ),
                OutlinedButton(
                  onPressed: () => Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(
                      builder: (_) => const LmsDashboardScreen(),
                    ),
                    (r) => r.isFirst,
                  ),
                  child: const Text('Dashboard'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _resultCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
