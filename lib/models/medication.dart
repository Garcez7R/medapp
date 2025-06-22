import 'dart:convert';

class Medication {
  final String id;
  final String name;
  final String dosage;
  final String time;
  bool taken;

  Medication({
    required this.id,
    required this.name,
    required this.dosage,
    required this.time,
    this.taken = false,
  });

  factory Medication.fromJson(Map<String, dynamic> json) {
    return Medication(
      id: json['id'],
      name: json['name'],
      dosage: json['dosage'],
      time: json['time'],
      taken: json['taken'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'dosage': dosage,
      'time': time,
      'taken': taken,
    };
  }
}
