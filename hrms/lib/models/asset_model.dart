class Asset {
  final String? id;
  final String name;
  final String? type;
  final String? assetCategory;
  final String? serialNumber;
  final String? location;
  final String status;
  final String? branchId;
  final Map<String, dynamic>? branch;
  final String? notes;
  final String? assetPhoto;
  final Map<String, dynamic>? assignedTo;
  final Map<String, dynamic>? assetTypeId;

  Asset({
    this.id,
    required this.name,
    this.type,
    this.assetCategory,
    this.serialNumber,
    this.location,
    required this.status,
    this.branchId,
    this.branch,
    this.notes,
    this.assetPhoto,
    this.assignedTo,
    this.assetTypeId,
  });

  factory Asset.fromJson(Map<String, dynamic> json) {
    return Asset(
      id: json['_id'] ?? json['id'],
      name: json['name'] ?? '',
      type: json['type'] ?? json['assetTypeId']?['name'],
      assetCategory: json['assetCategory'] ?? json['assetTypeId']?['name'],
      serialNumber: json['serialNumber'],
      location: json['location'] ?? '',
      status: json['status'] ?? 'Working',
      branchId: json['branchId']?['_id'] ?? json['branchId'],
      branch: json['branchId'] is Map ? json['branchId'] : null,
      notes: json['notes'],
      assetPhoto: json['assetPhoto'] ?? json['image'], // Handle both fields
      assignedTo: json['assignedTo'] is Map ? json['assignedTo'] : null,
      assetTypeId: json['assetTypeId'] is Map ? json['assetTypeId'] : null,
    );
  }

  String get branchName {
    if (branch != null) {
      final branchName = branch!['branchName'] ?? '';
      final branchCode = branch!['branchCode'] ?? '';
      if (branchCode.isNotEmpty) {
        return '$branchName ($branchCode)';
      }
      return branchName;
    }
    return '';
  }
}
