// hrms/lib/models/customer.dart
import 'package:json_annotation/json_annotation.dart';

part 'customer.g.dart';

@JsonSerializable()
class Customer {
  @JsonKey(name: '_id')
  final String? id;
  final String customerName;
  final String? customerNumber;
  final String address;
  final String city;
  final String pincode;
  final String? createdBy;
  final String? createdAt;
  final String? updatedAt;

  Customer({
    this.id,
    required this.customerName,
    this.customerNumber,
    required this.address,
    required this.city,
    required this.pincode,
    this.createdBy,
    this.createdAt,
    this.updatedAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) =>
      _$CustomerFromJson(json);
  Map<String, dynamic> toJson() => _$CustomerToJson(this);

  Customer copyWith({
    String? id,
    String? customerName,
    String? customerNumber,
    String? address,
    String? city,
    String? pincode,
    String? createdBy,
    String? createdAt,
    String? updatedAt,
  }) {
    return Customer(
      id: id ?? this.id,
      customerName: customerName ?? this.customerName,
      customerNumber: customerNumber ?? this.customerNumber,
      address: address ?? this.address,
      city: city ?? this.city,
      pincode: pincode ?? this.pincode,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
