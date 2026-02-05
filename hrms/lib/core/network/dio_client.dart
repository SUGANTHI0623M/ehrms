// core/network/dio_client.dart
// Single place for Dio configuration. Used by data layer only.
// No business logic — only auth header, retry, and logging.

import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../config/constants.dart';

/// Retries on 429 (rate limit) with exponential backoff. Respects Retry-After.
class RetryOnRateLimitInterceptor extends Interceptor {
  RetryOnRateLimitInterceptor(this.dio);
  final Dio dio;
  static const int maxRetries = 3;
  static const List<int> backoffDelaysSeconds = [2, 4, 6];

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 429) {
      return handler.next(err);
    }
    final extra = err.requestOptions.extra;
    final retryCount = extra['retry_count'] as int? ?? 0;
    if (retryCount >= maxRetries) {
      if (kDebugMode) debugPrint('[DioClient] 429 after $maxRetries retries');
      return handler.next(err);
    }
    int waitSeconds =
        backoffDelaysSeconds[retryCount.clamp(
          0,
          backoffDelaysSeconds.length - 1,
        )];
    final retryAfter = err.response?.headers.value('retry-after');
    if (retryAfter != null && retryAfter.isNotEmpty) {
      final parsed = int.tryParse(retryAfter);
      if (parsed != null && parsed > 0)
        waitSeconds = parsed > 120 ? 120 : parsed;
    }
    if (kDebugMode) {
      debugPrint(
        '[DioClient] 429 retry ${retryCount + 1}/$maxRetries in ${waitSeconds}s',
      );
    }
    await Future<void>.delayed(Duration(seconds: waitSeconds));
    final opts = err.requestOptions;
    opts.extra['retry_count'] = retryCount + 1;
    try {
      final response = await dio.fetch(opts);
      return handler.resolve(response);
    } catch (e) {
      return handler.next(err);
    }
  }
}

/// Ensures multipart uploads are not sent with Content-Type: application/json.
class FormDataContentTypeInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (options.data is FormData) {
      options.headers.remove('Content-Type');
      // Dio will set multipart/form-data with boundary when sending
    }
    handler.next(options);
  }
}

/// Debug request/error logging only.
class DebugLogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) debugPrint('[DioClient] ${options.method} ${options.uri}');
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint(
        '[DioClient] Error ${err.response?.statusCode} ${err.requestOptions.uri}',
      );
    }
    handler.next(err);
  }
}

/// Central Dio client for the app. Used only by data layer (datasources).
/// Auth token is set before authenticated requests; interceptors handle retry and logging.
class DioClient {
  static final DioClient _instance = DioClient._internal();
  factory DioClient() => _instance;

  late final Dio dio;

  DioClient._internal() {
    final base = AppConstants.baseUrl;
    final baseUrl = base.endsWith('/')
        ? base.substring(0, base.length - 1)
        : base;
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        sendTimeout: const Duration(seconds: 20),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
    dio.interceptors.addAll([
      FormDataContentTypeInterceptor(),
      RetryOnRateLimitInterceptor(dio),
      if (kDebugMode) DebugLogInterceptor(),
    ]);
  }

  void setAuthToken(String? token) {
    if (token == null || token.isEmpty) {
      dio.options.headers.remove('Authorization');
    } else {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  void clearAuthToken() {
    dio.options.headers.remove('Authorization');
  }
}
