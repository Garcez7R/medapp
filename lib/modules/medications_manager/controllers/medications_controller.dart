import '../models/medication.dart';

class MedicationsController {
  final List<Medication> _medications = [];

  List<Medication> get medications => _medications;

  void addMedication(Medication med) {
    _medications.add(med);
  }

  void removeMedication(String id) {
    _medications.removeWhere((med) => med.id == id);
  }
}
