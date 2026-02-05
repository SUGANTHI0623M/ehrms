// Add Task – full-screen form, Request module UI patterns.
// Fields: Task Title, Customer (searchable), Description, Source, Destination.

import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/customer.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/services/customer_service.dart';
import 'package:hrms/services/geo/places_service.dart';
import 'package:hrms/services/task_service.dart';
import 'package:hrms/screens/geo/live_tracking_screen.dart';
import 'package:hrms/widgets/app_drawer.dart';
import 'package:hrms/widgets/bottom_navigation_bar.dart';
import 'package:hrms/widgets/menu_icon_button.dart';

class AddTaskScreen extends StatefulWidget {
  final String staffId;

  const AddTaskScreen({super.key, required this.staffId});

  @override
  State<AddTaskScreen> createState() => _AddTaskScreenState();
}

class _AddTaskScreenState extends State<AddTaskScreen> {
  final _formKey = GlobalKey<FormState>();
  final _taskTitleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _sourceController = TextEditingController();
  final _destinationController = TextEditingController();
  final _customerSearchController = TextEditingController();

  Customer? _selectedCustomer;
  List<Customer> _allCustomers = [];
  List<Customer> _filteredCustomers = [];
  bool _loadingCustomers = true;
  bool _submitting = false;
  bool _showCustomerDropdown = false;
  bool _showSourceSuggestions = false;
  bool _showDestinationSuggestions = false;
  final FocusNode _customerFocusNode = FocusNode();
  List<PlacePrediction> _sourcePredictions = [];
  List<PlacePrediction> _destinationPredictions = [];
  String _sourceAddress = '';
  String _destinationAddress = '';
  bool _useCurrentLocationForSource = true;
  bool _destinationChangedByUser = false;
  String _currentLocationAddress = '';
  bool _loadingCurrentLocation = false;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
    _customerSearchController.addListener(_onCustomerSearchChanged);
    _customerFocusNode.addListener(() {
      if (!_customerFocusNode.hasFocus) {
        setState(() => _showCustomerDropdown = false);
      }
    });
    if (_useCurrentLocationForSource) _fetchCurrentLocationAddress();
  }

  Future<void> _fetchCurrentLocationAddress() async {
    setState(() => _loadingCurrentLocation = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted)
          setState(() {
            _currentLocationAddress = 'Location permission denied';
            _loadingCurrentLocation = false;
          });
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      if (mounted && placemarks.isNotEmpty) {
        final p = placemarks.first;
        final addr = [
          p.street,
          p.subLocality,
          p.locality,
          p.administrativeArea,
          p.country,
        ].where((e) => e != null && e.isNotEmpty).join(', ');
        setState(() {
          _currentLocationAddress = addr.isNotEmpty
              ? addr
              : 'Current location (GPS)';
          _loadingCurrentLocation = false;
        });
      } else if (mounted) {
        setState(() {
          _currentLocationAddress = 'Current location (GPS)';
          _loadingCurrentLocation = false;
        });
      }
    } catch (_) {
      if (mounted)
        setState(() {
          _currentLocationAddress = 'Current location (GPS)';
          _loadingCurrentLocation = false;
        });
    }
  }

  @override
  void dispose() {
    _customerFocusNode.dispose();
    _taskTitleController.dispose();
    _descriptionController.dispose();
    _sourceController.dispose();
    _destinationController.dispose();
    _customerSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    setState(() => _loadingCustomers = true);
    try {
      final list = await CustomerService().getAllCustomers();
      if (mounted) {
        setState(() {
          _allCustomers = list;
          _filteredCustomers = list;
          _loadingCustomers = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadingCustomers = false;
          _filteredCustomers = [];
        });
      }
    }
  }

  void _onCustomerSearchChanged() {
    final q = _customerSearchController.text.trim().toLowerCase();
    setState(() {
      if (q.isEmpty) {
        _filteredCustomers = _allCustomers;
      } else {
        _filteredCustomers = _allCustomers
            .where(
              (c) =>
                  c.customerName.toLowerCase().contains(q) ||
                  (c.address.toLowerCase().contains(q)),
            )
            .toList();
      }
    });
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 22, color: AppColors.primary),
      labelStyle: const TextStyle(color: Colors.black),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: AppColors.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  /// Description format: "Source: X\nDestination: Y\n\n{user description}"
  String _buildDescription() {
    final src = _sourceAddress.isNotEmpty
        ? _sourceAddress
        : _sourceController.text.trim();
    final dest = _destinationAddress.isNotEmpty
        ? _destinationAddress
        : _destinationController.text.trim();
    final body = _descriptionController.text.trim();
    if (src.isEmpty && dest.isEmpty) return body;
    final parts = <String>[];
    if (src.isNotEmpty) parts.add('Source: $src');
    if (dest.isNotEmpty) parts.add('Destination: $dest');
    if (body.isNotEmpty) parts.add(body);
    return parts.join('\n\n');
  }

  Future<void> _searchSource(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _showSourceSuggestions = false;
        _sourcePredictions = [];
      });
      return;
    }
    final list = await PlacesService.autocomplete(query);
    if (mounted) {
      setState(() {
        _sourcePredictions = list;
        _showSourceSuggestions = true;
      });
    }
  }

  Future<void> _searchDestination(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _showDestinationSuggestions = false;
        _destinationPredictions = [];
      });
      return;
    }
    final list = await PlacesService.autocomplete(query);
    if (mounted) {
      setState(() {
        _destinationPredictions = list;
        _showDestinationSuggestions = true;
      });
    }
  }

  Future<void> _onSourceSelected(PlaceDetails details) async {
    setState(() {
      _sourceAddress =
          details.formattedAddress ?? '${details.lat}, ${details.lng}';
      _sourceController.text = _sourceAddress;
      _showSourceSuggestions = false;
      _sourcePredictions = [];
    });
  }

  Future<void> _onDestinationSelected(PlaceDetails details) async {
    setState(() {
      _destinationAddress =
          details.formattedAddress ?? '${details.lat}, ${details.lng}';
      _destinationController.text = _destinationAddress;
      _destinationChangedByUser = true;
      _showDestinationSuggestions = false;
      _destinationPredictions = [];
    });
  }

  void _onCustomerSelected(Customer c) {
    setState(() {
      _selectedCustomer = c;
      _customerSearchController.text = c.customerName;
      _showCustomerDropdown = false;
      final addr = '${c.address}, ${c.city}, ${c.pincode}'.trim();
      if (!_destinationChangedByUser) {
        _destinationController.text = addr;
        _destinationAddress = addr;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCustomer == null || _selectedCustomer!.id == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a customer')));
      return;
    }
    final destAddr = _destinationAddress.isNotEmpty
        ? _destinationAddress
        : _destinationController.text.trim();
    if (destAddr.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please set destination address')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final taskId = 'TASK-${DateTime.now().millisecondsSinceEpoch}';
      final task = await TaskService().createTask(
        taskId: taskId,
        taskTitle: _taskTitleController.text.trim(),
        description: _buildDescription(),
        assignedTo: widget.staffId,
        customerId: _selectedCustomer!.id!,
        expectedCompletionDate: DateTime.now().add(const Duration(days: 1)),
        status: 'assigned',
      );
      if (!mounted) return;
      final taskWithCustomer = task.copyWith(customer: _selectedCustomer);

      LatLng pickup;
      if (_useCurrentLocationForSource) {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          if (mounted) {
            setState(() => _submitting = false);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission denied')),
            );
          }
          return;
        }
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );
        pickup = LatLng(position.latitude, position.longitude);
      } else {
        final srcAddr = _sourceAddress.isNotEmpty
            ? _sourceAddress
            : _sourceController.text.trim();
        if (srcAddr.isEmpty) {
          if (mounted) {
            setState(() => _submitting = false);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please set source address')),
            );
          }
          return;
        }
        final locs = await locationFromAddress(srcAddr);
        if (locs.isEmpty) {
          if (mounted) {
            setState(() => _submitting = false);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Could not find source address')),
            );
          }
          return;
        }
        pickup = LatLng(locs.first.latitude, locs.first.longitude);
      }

      List<Location> destLocs = [];
      try {
        destLocs = await locationFromAddress(destAddr);
      } catch (_) {}
      if (destLocs.isEmpty) {
        if (mounted) {
          setState(() => _submitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not find destination address')),
          );
        }
        return;
      }
      final dropoff = LatLng(destLocs.first.latitude, destLocs.first.longitude);

      await TaskService().updateTask(
        taskWithCustomer.id!,
        status: 'in_progress',
        startTime: DateTime.now(),
        startLat: pickup.latitude,
        startLng: pickup.longitude,
      );

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => LiveTrackingScreen(
            taskId: taskWithCustomer.taskId,
            taskMongoId: taskWithCustomer.id,
            pickupLocation: pickup,
            dropoffLocation: dropoff,
            task: taskWithCustomer,
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to create task: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: const MenuIconButton(),
        title: const Text(
          'Add Task',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      drawer: AppDrawer(currentIndex: 1),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  16,
                  16,
                  16,
                  16 + MediaQuery.of(context).viewInsets.bottom,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _taskTitleController,
                      decoration: _inputDecoration(
                        'Task Title',
                        Icons.title_rounded,
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Required' : null,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 16),
                    _buildCustomerField(),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _descriptionController,
                      decoration: _inputDecoration(
                        'Description',
                        Icons.description_rounded,
                      ),
                      maxLines: 4,
                      textInputAction: TextInputAction.newline,
                    ),
                    const SizedBox(height: 16),
                    _buildSourceField(),
                    const SizedBox(height: 16),
                    _buildAddressField(
                      label: 'Destination Address',
                      controller: _destinationController,
                      icon: Icons.location_on_rounded,
                      showSuggestions: _showDestinationSuggestions,
                      predictions: _destinationPredictions,
                      onSearch: _searchDestination,
                      onSelect: _onDestinationSelected,
                      onClear: () => setState(() {
                        _showDestinationSuggestions = false;
                        _destinationPredictions = [];
                      }),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SafeArea(
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _submitting ? null : _submit,
                    icon: _submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(
                            Icons.add_rounded,
                            color: Colors.white,
                            size: 22,
                          ),
                    label: Text(
                      _submitting ? 'Creating...' : 'Create Task',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 2,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNavigationBar(currentIndex: 0),
    );
  }

  Widget _buildSourceField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Source Address',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade700,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Checkbox(
              value: _useCurrentLocationForSource,
              onChanged: (v) => setState(() {
                _useCurrentLocationForSource = v ?? true;
                if (_useCurrentLocationForSource) {
                  _sourceController.clear();
                  _sourceAddress = '';
                  _fetchCurrentLocationAddress();
                }
              }),
              activeColor: AppColors.primary,
            ),
            const Text('Use current location', style: TextStyle(fontSize: 14)),
          ],
        ),
        if (_useCurrentLocationForSource) ...[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.06),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primary.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.gps_fixed_rounded,
                  size: 20,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _loadingCurrentLocation
                      ? Text(
                          'Getting your location...',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        )
                      : Text(
                          _currentLocationAddress,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                ),
              ],
            ),
          ),
        ],
        if (!_useCurrentLocationForSource) ...[
          const SizedBox(height: 8),
          _buildAddressField(
            label: 'Search source address',
            controller: _sourceController,
            icon: Icons.gps_fixed_rounded,
            showSuggestions: _showSourceSuggestions,
            predictions: _sourcePredictions,
            onSearch: _searchSource,
            onSelect: _onSourceSelected,
            onClear: () => setState(() {
              _showSourceSuggestions = false;
              _sourcePredictions = [];
            }),
          ),
        ],
      ],
    );
  }

  Widget _buildCustomerField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Customer',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade700,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          focusNode: _customerFocusNode,
          controller: _customerSearchController,
          decoration: InputDecoration(
            prefixIcon: Icon(
              Icons.person_rounded,
              size: 22,
              color: AppColors.primary,
            ),
            hintText: 'Search customer by name or address',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
          ),
          onTap: () => setState(() => _showCustomerDropdown = true),
          onChanged: (_) => setState(() => _showCustomerDropdown = true),
        ),
        if (_showCustomerDropdown) ...[
          const SizedBox(height: 4),
          Container(
            constraints: const BoxConstraints(maxHeight: 200),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: _loadingCustomers
                ? const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  )
                : _filteredCustomers.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'No customers found',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    itemCount: _filteredCustomers.length,
                    itemBuilder: (context, i) {
                      final c = _filteredCustomers[i];
                      return ListTile(
                        dense: true,
                        title: Text(
                          c.customerName,
                          style: const TextStyle(fontSize: 14),
                        ),
                        subtitle: Text(
                          '${c.address}, ${c.city}',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => _onCustomerSelected(c),
                      );
                    },
                  ),
          ),
        ],
      ],
    );
  }

  Widget _buildAddressField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required bool showSuggestions,
    required List<PlacePrediction> predictions,
    required Future<void> Function(String) onSearch,
    required Future<void> Function(PlaceDetails) onSelect,
    required VoidCallback onClear,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade700,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          decoration: InputDecoration(
            prefixIcon: Icon(icon, size: 22, color: AppColors.primary),
            hintText: 'Search address...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
          ),
          onChanged: (v) {
            if (v.length >= 3) {
              onSearch(v);
            } else {
              onClear();
            }
          },
        ),
        if (showSuggestions && predictions.isNotEmpty) ...[
          const SizedBox(height: 4),
          Container(
            constraints: const BoxConstraints(maxHeight: 200),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: predictions.length,
              itemBuilder: (context, i) {
                final p = predictions[i];
                return ListTile(
                  dense: true,
                  title: Text(p.mainText, style: const TextStyle(fontSize: 12)),
                  subtitle: p.secondaryText.isNotEmpty
                      ? Text(
                          p.secondaryText,
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey.shade600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        )
                      : null,
                  onTap: () async {
                    final details = await PlacesService.getPlaceDetails(
                      p.placeId,
                    );
                    if (details != null && mounted) {
                      await onSelect(details);
                    }
                  },
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}
