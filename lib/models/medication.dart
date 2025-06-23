import 'package:hive/hive.dart';

part 'medication.g.dart';

@HiveType(typeId: 0)
class Medication extends HiveObject {
  @HiveField(0)
  int id;

  @HiveField(1)
  String name;

  @HiveField(2)
  String dosage;

  @HiveField(3)
  int? frequencyHours;

  @HiveField(4)
  int? durationDays;

  @HiveField(5)
  bool taken;

  @HiveField(6)
  String? firstDoseTime; // "HH:mm"

  @HiveField(7)
  List<String> manualSchedules; // lista de horários "HH:mm"

  Medication({
    required this.id,
    required this.name,
    required this.dosage,
    this.frequencyHours,
    this.durationDays,
    this.taken = false,
    this.firstDoseTime,
    List<String>? manualSchedules,
  }) : manualSchedules = manualSchedules ?? [];
}
