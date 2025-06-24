import 'package:flutter/material.dart';

class Medication {
  String id;
  String name;
  String dosage;
  int frequency;
  int duration;
  bool taken;
  TimeOfDay? time;

  Medication({
    required this.id,
    required this.name,
    required this.dosage,
    required this.frequency,
    required this.duration,
    this.taken = false,
    this.time,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'dosage': dosage,
      'frequency': frequency,
      'duration': duration,
      'taken': taken,
      'time': time != null ? '${time!.hour}:${time!.minute}' : null,
    };
  }

  factory Medication.fromJson(Map<String, dynamic> json) {
    final timeParts = (json['time'] as String?)?.split(':');
    TimeOfDay? parsedTime;
    if (timeParts != null && timeParts.length == 2) {
      parsedTime = TimeOfDay(
        hour: int.parse(timeParts[0]),
        minute: int.parse(timeParts[1]),
      );
    }

    return Medication(
      id: json['id'],
      name: json['name'],
      dosage: json['dosage'],
      frequency: json['frequency'],
      duration: json['duration'],
      taken: json['taken'] ?? false,
      time: parsedTime,
    );
  }
}
