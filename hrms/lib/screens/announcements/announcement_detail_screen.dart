import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
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
        if (item is! Map) continue;
        final mimeType = (item['mimeType'] as String?)?.toLowerCase() ?? '';
        if (mimeType.isNotEmpty && !mimeType.startsWith('image/')) continue;
        final url = _getAttachmentUrl(item);
        if (url != null && !list.contains(url)) list.add(url);
      }
    }
    return list;
  }

  static String? _getAttachmentUrl(dynamic item) {
    if (item is String && item.trim().isNotEmpty) {
      return item.startsWith('http') ? item : '${AppConstants.fileBaseUrl}${item.startsWith('/') ? item : '/$item'}';
    }
    if (item is Map) {
      final u = (item['path'] ?? item['url'])?.toString();
      if (u != null && u.trim().isNotEmpty) {
        return u.startsWith('http') ? u : '${AppConstants.fileBaseUrl}${u.startsWith('/') ? u : '/$u'}';
      }
    }
    return null;
  }

  static Future<void> _openAttachmentUrl(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  static Widget _buildAttachmentTile(
    BuildContext context, {
    required String name,
    required String url,
    required String mimeType,
    required Color accent,
    required ColorScheme colorScheme,
  }) {
    final isPdf = mimeType.contains('pdf');
    final isImage = mimeType.startsWith('image/');
    final icon = isPdf
        ? Icons.picture_as_pdf_outlined
        : isImage
            ? Icons.image_outlined
            : Icons.insert_drive_file_outlined;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: colorScheme.surfaceContainerHighest.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _openAttachmentUrl(context, url),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: accent.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: accent, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: colorScheme.onSurface,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(Icons.open_in_new, size: 18, color: accent),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static List<Map<String, dynamic>> _getAttachments(Map<String, dynamic> a) {
    final list = <Map<String, dynamic>>[];
    final attachments = a['attachments'];
    if (attachments is! List) return list;
    for (final item in attachments) {
      if (item is! Map) continue;
      final url = _getAttachmentUrl(item);
      if (url == null) continue;
      final name = (item['name'] as String?)?.trim() ?? 'Attachment';
      final mimeType = (item['mimeType'] as String?)?.toLowerCase() ?? '';
      list.add({'name': name, 'url': url, 'mimeType': mimeType});
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final title = announcement['title']?.toString() ?? 'Announcement';
    final description = announcement['description']?.toString() ?? '';
    final fromName = announcement['fromName']?.toString();
    final date = _parseDate(announcement['publishDate']) ?? _parseDate(announcement['effectiveDate']);
    final dateStr = date != null ? DateFormat('d MMM y, h:mm a').format(date) : '';
    final imageUrls = _getImageUrls(announcement);
    final attachments = _getAttachments(announcement);

    return Scaffold(
      backgroundColor: colorScheme.surfaceContainerHighest,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: colorScheme.onSurface,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: colorScheme.surface,
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
                                style: TextStyle(
                                  color: colorScheme.onSurfaceVariant,
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
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: colorScheme.shadow.withOpacity(0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Description',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 15,
                        color: colorScheme.onSurface,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (attachments.isNotEmpty) ...[
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: colorScheme.shadow.withOpacity(0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.attach_file, size: 18, color: accent),
                        const SizedBox(width: 8),
                        Text(
                          'Attachments',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...attachments.map((att) => _buildAttachmentTile(
                          context,
                          name: att['name'] as String,
                          url: att['url'] as String,
                          mimeType: att['mimeType'] as String? ?? '',
                          accent: accent,
                          colorScheme: colorScheme,
                        )),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNavigationBar(currentIndex: -1),
    );
  }
}
