// bloc/auth/auth_bloc.dart
// Business logic and state for auth. Calls AuthRepository only; no HTTP/JSON.

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../repository/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({AuthRepository? repository})
      : _repo = repository ?? AuthRepository(),
        super(AuthInitial()) {
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthGoogleLoginRequested>(_onGoogleLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthProfileRequested>(_onProfileRequested);
  }

  final AuthRepository _repo;

  Future<void> _onLoginRequested(AuthLoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoadInProgress());
    final result = await _repo.login(event.email, event.password);
    if (result['success'] == true) {
      emit(AuthLoginSuccess(data: result['data']));
    } else {
      emit(AuthFailure(message: result['message'] as String? ?? 'Login failed'));
    }
  }

  Future<void> _onGoogleLoginRequested(AuthGoogleLoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoadInProgress());
    final result = await _repo.googleLoginBackend(event.email);
    if (result['success'] == true) {
      emit(AuthLoginSuccess(data: result['data']));
    } else {
      emit(AuthFailure(message: result['message'] as String? ?? 'Login failed'));
    }
  }

  Future<void> _onLogoutRequested(AuthLogoutRequested event, Emitter<AuthState> emit) async {
    await _repo.logout();
    emit(AuthInitial());
  }

  Future<void> _onProfileRequested(AuthProfileRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoadInProgress());
    final result = await _repo.getProfile();
    if (result['success'] == true) {
      emit(AuthProfileLoaded(data: result['data']));
    } else {
      emit(AuthFailure(message: result['message'] as String? ?? 'Failed to load profile'));
    }
  }
}
