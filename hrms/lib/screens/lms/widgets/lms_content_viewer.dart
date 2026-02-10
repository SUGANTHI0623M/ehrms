// hrms/lib/screens/lms/widgets/lms_content_viewer.dart
// Embedded content viewer for YouTube, VIDEO, PDF, URL - mirrors web LMSCoursePlayer
// YouTube: uses loadHtmlString with baseUrl to fix Error 153 (Referer required)

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../config/constants.dart';

class LmsContentViewer extends StatelessWidget {
  final dynamic material;
  final VoidCallback? onMarkDone;

  const LmsContentViewer({super.key, required this.material, this.onMarkDone});

  String? _getVideoId() {
    var url =
        material['url'] ??
        material['filePath'] ??
        material['link'] ??
        material['externalUrl'] ??
        '';
    url = url.toString().trim();
    if (url.isEmpty) return null;
    if (url.contains('v=')) return url.split('v=')[1]?.split('&')[0];
    return url.split('/').last;
  }

  String? _getResolvedUrl() {
    final type = (material['type'] ?? 'URL').toString().toUpperCase();
    var url =
        material['url'] ??
        material['filePath'] ??
        material['link'] ??
        material['externalUrl'] ??
        '';
    url = url.toString().trim();
    if (url.isEmpty) return null;

    if (type == 'YOUTUBE') {
      final videoId = _getVideoId();
      if (videoId != null && videoId.isNotEmpty) {
        return 'https://www.youtube.com/embed/$videoId?autoplay=0&rel=0&modestbranding=1';
      }
      return null;
    }

    if (url.startsWith('http') ||
        url.startsWith('https') ||
        url.startsWith('data:')) {
      return url;
    }
    return AppConstants.getLmsFileUrl(url);
  }

  /// YouTube embed HTML with referrerpolicy to fix Error 153. Load with baseUrl so Referer is sent.
  String _buildYouTubeEmbedHtml(String videoId) {
    final embedUrl = 'https://www.youtube-nocookie.com/embed/$videoId'
        '?enablejsapi=1&rel=0&modestbranding=1&playsinline=1&autoplay=0&origin=https://www.youtube.com';
    return '''
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>html,body{margin:0;padding:0;height:100%;background:#000}
iframe{width:100%;height:100%;border:0;display:block}
</style>
</head>
<body>
<iframe src="$embedUrl"
  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
  allowfullscreen
  referrerpolicy="strict-origin-when-cross-origin">
</iframe>
</body>
</html>''';
  }

  /// PDF in WebView often shows blank when loaded via loadRequest. Load via HTML iframe (same as web) so the page has a document and iframe can render PDF on supported devices.
  Widget _buildPdfViewer(BuildContext context, String pdfUrl) {
    final pdfSrc = '$pdfUrl#toolbar=1&view=FitH';
    final uri = Uri.tryParse(pdfUrl);
    final baseUrl = uri != null ? '${uri.scheme}://${uri.host}${uri.port != 80 && uri.port != 443 ? ':${uri.port}' : ''}/' : null;
    final html = '''
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: #f5f5f5; }
iframe { width: 100%; height: 100%; border: none; display: block; }
</style>
</head>
<body>
<iframe src="$pdfSrc" title="PDF"></iframe>
</body>
</html>''';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.55,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: WebViewWidget(
              controller: WebViewController()
                ..setJavaScriptMode(JavaScriptMode.unrestricted)
                ..setBackgroundColor(Colors.grey.shade100)
                ..loadHtmlString(
                  html,
                  baseUrl: baseUrl,
                ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Text(
            'If the PDF doesn\'t appear, use the Open button above to view in your browser.',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }

  Widget _buildYouTubePlayer(BuildContext context) {
    final videoId = _getVideoId();
    if (videoId == null || videoId.isEmpty) {
      return _buildPlaceholder('Invalid YouTube link.');
    }
    final html = _buildYouTubeEmbedHtml(videoId);
    const baseUrl = 'https://www.youtube-nocookie.com/';
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: WebViewWidget(
          controller: WebViewController()
            ..setJavaScriptMode(JavaScriptMode.unrestricted)
            ..loadHtmlString(html, baseUrl: baseUrl),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final type = (material['type'] ?? 'URL').toString().toUpperCase();
    final urlToLoad = _getResolvedUrl();

    if (urlToLoad == null || urlToLoad.isEmpty) {
      return _buildPlaceholder(
        'No learning material available for this lesson.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (type == 'PDF')
          _buildPdfViewer(context, urlToLoad)
        else if (type == 'YOUTUBE')
          _buildYouTubePlayer(context)
        else
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: WebViewWidget(
                controller: WebViewController()
                  ..setJavaScriptMode(JavaScriptMode.unrestricted)
                  ..loadRequest(Uri.parse(urlToLoad)),
              ),
            ),
          ),
        if (onMarkDone != null) ...[
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onMarkDone,
              icon: const Icon(Icons.check_circle_outline),
              label: const Text('Mark Done'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPlaceholder(String message) {
    return Container(
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          message,
          style: TextStyle(color: Colors.grey[600]),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
