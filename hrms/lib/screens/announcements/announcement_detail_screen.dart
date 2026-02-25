import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_colors.dart';
import '../../config/constants.dart';
import '../../widgets/bottom_navigation_bar.dart';

class AnnouncementDetailScreen extends StatelessWidget {
  final Map<String, dynamic> announcement;
  final Color accent;

  const AnnouncementDetailScreen({
    super.key,
    required this.announcement,
    required this.accent,
  });

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is String) return DateTime.tryParse(value);
    if (value is Map && value['\$date'] != null) {
      return DateTime.tryParse(value['\$date'].toString());
    }
    return null;
  }

  static List<String> _getImageUrls(Map<String, dynamic> a) {
    final list = <String>[];
    final cover = a['coverImage']?.toString();
    if (cover != null && cover.trim().isNotEmpty) {
      if (cover.startsWith('http://') || cover.startsWith('https://')) {
        list.add(cover);
      } else {
        final path = cover.startsWith('/') ? cover : '/$cover';
        list.add('${AppConstants.fileBaseUrl}$path');
      }
    }
    final attachments = a['attachments'];
    if (attachments is List) {
      for (final item in attachments) {
        String? url;
        if (item is String && item.trim().isNotEmpty) {
          url = item.startsWith('http') ? item : '${AppConstants.fileBaseUrl}${item.startsWith('/') ? item : '/$item'}';
        } else if (item is Map) {
          final u = item['url']?.toString();
          if (u != null && u.trim().isNotEmpty) {
            url = u.startsWith('http') ? u : '${AppConstants.fileBaseUrl}${u.startsWith('/') ? u : '/$u'}';
          }
        }
        if (url != null && !list.contains(url)) list.add(url);
      }
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final title = announcement['title']?.toString() ?? 'Announcement';
    final description = announcement['description']?.toString() ?? '';
    final fromName = announcement['fromName']?.toString();
    final date = _parseDate(announcement['publishDate']) ?? _parseDate(announcement['effectiveDate']);
    final dateStr = date != null ? DateFormat('d MMM y, h:mm a').format(date) : '';
    final imageUrls = _getImageUrls(announcement);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Color(0xFF1E293B),
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        iconTheme: const IconThemeData(color: Color(0xFF6366F1)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border(left: BorderSide(color: accent, width: 4)),
                boxShadow: [
                  BoxShadow(
                    color: accent.withOpacity(0.1),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: accent.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(Icons.campaign_rounded, color: accent, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                                color: accent,
                              ),
                            ),
                            if (fromName != null && fromName.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                'From: $fromName',
                                style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                            if (dateStr.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Icon(Icons.schedule_rounded, size: 18, color: accent.withOpacity(0.9)),
                                  const SizedBox(width: 6),
                                  Text(
                                    dateStr,
                                    style: TextStyle(
                                      color: accent.withOpacity(0.9),
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (imageUrls.isNotEmpty) ...[
              const SizedBox(height: 20),
              ...imageUrls.map((url) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    url,
                    width: double.infinity,
                    height: 220,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
              )),
              const SizedBox(height: 8),
            ],
            if (description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Description',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      description,
                      style: const TextStyle(
                        fontSize: 15,
                        color: Color(0xFF475569),
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNavigationBar(currentIndex: 0),
    );
  }
}
