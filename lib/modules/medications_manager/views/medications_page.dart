import 'package:flutter/material.dart';
import '../../medications_manager/controllers/medications_controller.dart';
import '../../medications_manager/models/medication.dart';

class MedicationsPage extends StatelessWidget {
  final controller = MedicationsController();

  MedicationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meus Medicamentos')),
      body: ListView(
        children: controller.medications
            .map((med) => ListTile(
                  title: Text(med.name),
                  subtitle: Text('${med.dosage} • ${med.frequency}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete),
                    onPressed: () {
                      controller.removeMedication(med.id);
                    },
                  ),
                ))
            .toList(),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Aqui você pode adicionar o código para abrir o formulário de novo medicamento
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
