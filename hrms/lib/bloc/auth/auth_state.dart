part of 'auth_bloc.dart';

abstract class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoadInProgress extends AuthState {}

class AuthLoginSuccess extends AuthState {
  final dynamic data;
  const AuthLoginSuccess({this.data});
  @override
  List<Object?> get props => [data];
}

class AuthProfileLoaded extends AuthState {
  final dynamic data;
  const AuthProfileLoaded({this.data});
  @override
  List<Object?> get props => [data];
}

class AuthFailure extends AuthState {
  final String message;
  const AuthFailure({required this.message});
  @override
  List<Object?> get props => [message];
}
